import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { trustlessGateway } from '@helia/block-brokers'
import { createHeliaHTTP } from '@helia/http'
import { httpGatewayRouting } from '@helia/routers'
import { logger } from '@libp2p/logger'
import { dns } from '@multiformats/dns'
import { MemoryBlockstore } from 'blockstore-core'
import { Agent, setGlobalDispatcher } from 'undici'
import { contentTypeParser } from './content-type-parser.js'
import { createVerifiedFetch } from './create-verified-fetch.js'
import { getLocalDnsResolver } from './get-local-dns-resolver.js'
import { getIpnsRecordDatastore } from './ipns-record-datastore.js'
import type { DNSResolver } from '@multiformats/dns/resolvers'
import type { Blockstore } from 'interface-blockstore'
import type { Datastore } from 'interface-datastore'

const log = logger('basic-server')
/**
 * Create a basic server with native Node.js HTTP server that simply calls verifiedFetch and returns the response.
 *
 * This server needs to be wrapped by reverse-proxy to work for the gateway conformance tests.
 */

export interface BasicServerOptions {
  kuboGateway?: string
  serverPort: number

  /**
   * @see https://github.com/ipfs/kubo/blob/5de5b77168be347186dbc9f1586c2deb485ca2ef/docs/environment-variables.md#ipfs_ns_map
   */
  IPFS_NS_MAP: string
}

type Response = ServerResponse<IncomingMessage> & {
  req: IncomingMessage
}

interface CreateHeliaOptions {
  gateways: string[]
  dnsResolvers: DNSResolver[]
  blockstore: Blockstore
  datastore: Datastore
}

/**
 * We need to create helia manually so we can stub some of the things...
 */
async function createHelia (init: CreateHeliaOptions): Promise<ReturnType<typeof createHeliaHTTP>> {
  return createHeliaHTTP({
    blockstore: init.blockstore,
    datastore: init.datastore,
    blockBrokers: [
      trustlessGateway({
        allowInsecure: true,
        allowLocal: true
      })
    ],
    routers: [
      httpGatewayRouting({
        gateways: init.gateways
      })
    ],
    dns: dns({
      resolvers: {
        '.': init.dnsResolvers
      }
    })
  })
}

async function createAndCallVerifiedFetch (req: IncomingMessage, res: Response, { serverPort, useSessions, verifiedFetch, kuboGateway, localDnsResolver }: any): Promise<void> {
  const log = logger('basic-server:request')
  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }
  if (req.method === 'HEAD') {
    res.writeHead(200)
    res.end()
    return
  }

  if (req.url == null) {
    // this should never happen
    log.error('No URL provided, returning 400 Bad Request')
    res.writeHead(400)
    res.end('Bad Request')
    return
  }

  // @see https://github.com/ipfs/gateway-conformance/issues/185#issuecomment-2123708150
  let fixingGwcAnnoyance = false
  if (req.headers.host != null && (req.headers.host === 'localhost' || req.headers.Host === 'localhost')) {
    log.trace('set fixingGwcAnnoyance to true for %s', req.url)
    fixingGwcAnnoyance = true
    req.headers.host = `localhost:${serverPort}`
  }

  const fullUrlHref = new URL(req.url, `http://${req.headers.host}`)

  const urlLog = logger(`basic-server:request:${fullUrlHref}`)
  urlLog('configuring request')
  urlLog.trace('req.headers: %O', req.headers)
  let requestController: AbortController | null = new AbortController()
  // we need to abort the request if the client disconnects
  const onReqEnd = (): void => {
    urlLog('client disconnected, aborting request')
    requestController?.abort()
  }
  req.on('end', onReqEnd)

  const reqTimeout = setTimeout(() => {
    /**
     * Abort the request because it's taking too long.
     * This is only needed for when @helia/verified-fetch is not correctly
     * handling a request and should not be needed once we have 100% gateway
     * conformance coverage.
     */
    urlLog.error('timing out request')
    requestController?.abort()
  }, 2000)
  reqTimeout.unref() // don't keep the process alive just for this timeout

  const onResFinish = (): void => {
    urlLog.trace('response finished, aborting signal')
    requestController?.abort()
  }
  res.on('finish', onResFinish)

  try {
    urlLog.trace('calling verified-fetch')
    const resp = await verifiedFetch(fullUrlHref.toString(), { redirect: 'manual', signal: requestController.signal, session: useSessions, allowInsecure: true, allowLocal: true, headers: req.headers })
    urlLog.trace('verified-fetch response status: %d', resp.status)

    // loop over headers and set them on the response
    const headers: Record<string, string> = {}
    for (const [key, value] of resp.headers.entries()) {
      if (fixingGwcAnnoyance) {
        urlLog.trace('need to fix GWC annoyance.')
        if (value.includes(`localhost:${serverPort}`) === true) {
          const newValue = value.replace(`localhost:${serverPort}`, 'localhost')
          urlLog.trace('fixing GWC annoyance. Replacing Header[%s] value of "%s" with "%s"', key, value, newValue)
          // we need to fix any Location, or other headers that have localhost without port in them.
          headers[key] = newValue
        } else {
          urlLog.trace('NOT fixing GWC annoyance. Setting Header[%s] value of "%s"', key, value)
          headers[key] = value
        }
      } else {
        headers[key] = value
      }
    }

    res.writeHead(resp.status, headers)
    if (resp.body == null) {
      // need to convert ArrayBuffer to Buffer or Uint8Array
      res.write(Buffer.from(await resp.arrayBuffer()))
      urlLog.trace('wrote response')
    } else {
      // read the body of the response and write it to the response from the server
      const reader = resp.body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          urlLog.trace('response stream finished')
          break
        }

        res.write(Buffer.from(value))
      }
    }
    res.end()
  } catch (e: any) {
    urlLog.error('Problem with request: %s', e.message, e)
    if (!res.headersSent) {
      res.writeHead(500)
    }
    res.end(`Internal Server Error: ${e.message}`)
  } finally {
    urlLog.trace('Cleaning up request')
    clearTimeout(reqTimeout)
    requestController.abort()
    requestController = null
    req.off('end', onReqEnd)
    res.off('finish', onResFinish)
  }
}

export async function startBasicServer ({ kuboGateway, serverPort, IPFS_NS_MAP }: BasicServerOptions): Promise<() => Promise<void>> {
  const staticDnsAgent = new Agent({
    connect: {
      lookup: (_hostname, _options, callback) => { callback(null, [{ address: '0.0.0.0', family: 4 }]) }
    }
  })
  setGlobalDispatcher(staticDnsAgent)
  kuboGateway = kuboGateway ?? process.env.KUBO_GATEWAY
  const useSessions = process.env.USE_SESSIONS !== 'false'

  log('Starting basic server wrapper for verified-fetch %s', useSessions ? 'with sessions' : 'without sessions')

  if (kuboGateway == null) {
    throw new Error('options.kuboGateway or KUBO_GATEWAY env var is required')
  }

  const blockstore = new MemoryBlockstore()
  const datastore = getIpnsRecordDatastore()
  const localDnsResolver = getLocalDnsResolver(IPFS_NS_MAP, kuboGateway)

  const helia = await createHelia({ gateways: [kuboGateway], dnsResolvers: [localDnsResolver], blockstore, datastore })

  const verifiedFetch = await createVerifiedFetch(helia, {
    contentTypeParser
  })

  const server = createServer((req, res) => {
    try {
      void createAndCallVerifiedFetch(req, res, { serverPort, useSessions, kuboGateway, localDnsResolver, verifiedFetch }).catch((err) => {
        log.error('Error in createAndCallVerifiedFetch', err)

        if (!res.headersSent) {
          res.writeHead(500)
        }
        res.end('Internal Server Error')
      })
    } catch (err) {
      log.error('Error in createServer', err)

      if (!res.headersSent) {
        res.writeHead(500)
      }
      res.end('Internal Server Error')
    }
  })

  server.listen(serverPort, () => {
    log(`Basic server listening on port ${serverPort}`)
  })

  return async () => {
    log('Stopping...')
    await new Promise<void>((resolve, reject) => {
      // no matter what happens, we need to kill the server
      server.closeAllConnections()
      log('Closed all connections')
      server.close((err: any) => {
        if (err != null) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
}
