import { createServer } from 'node:http'
import { logger } from '@libp2p/logger'
import { type DNSResolver } from '@multiformats/dns/resolvers'
import { contentTypeParser } from './content-type-parser.js'
import { createVerifiedFetch } from './create-verified-fetch.js'

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

const getLocalDnsResolver = (ipfsNsMap: string): DNSResolver => {
  const log = logger('basic-server:dns')
  const nsMap = new Map<string, string>()
  const keyVals = ipfsNsMap.split(',')
  for (const keyVal of keyVals) {
    const [key, val] = keyVal.split(':')
    log('Setting entry: %s="%s"', key, val)
    nsMap.set(key, val)
  }
  return async (domain, options) => {
    log.trace('Querying "%s" for types %O', domain, options?.types)
    const actualDomainKey = domain.replace('_dnslink.', '')
    const nsValue = nsMap.get(actualDomainKey)
    if (nsValue == null) {
      log.error('No IPFS_NS_MAP entry for domain "%s"', actualDomainKey)
      throw new Error(`No IPFS_NS_MAP entry for domain "${actualDomainKey}"`)
    }
    const data = `dnslink=${nsValue}`
    log.trace('Returning DNS response for %s: %s', domain, data)

    return {
      Status: 0,
      TC: false,
      RD: false,
      RA: false,
      AD: true,
      CD: true,
      Question: [{
        name: domain,
        type: 16
      }],
      Answer: [{
        name: domain,
        type: 16,
        TTL: 180,
        data
        // data: 'dnslink=/ipfs/bafkqac3imvwgy3zao5xxe3de'
      }]
    }
  }
}

export async function startBasicServer ({ kuboGateway, serverPort, IPFS_NS_MAP }: BasicServerOptions): Promise<() => Promise<void>> {
  kuboGateway = kuboGateway ?? process.env.KUBO_GATEWAY
  const useSessions = process.env.USE_SESSIONS !== 'false'

  log('Starting basic server wrapper for verified-fetch %s', useSessions ? 'with sessions' : 'without sessions')

  if (kuboGateway == null) {
    throw new Error('options.kuboGateway or KUBO_GATEWAY env var is required')
  }

  const localDnsResolver = getLocalDnsResolver(IPFS_NS_MAP)
  const verifiedFetch = await createVerifiedFetch({
    gateways: [kuboGateway],
    routers: [],
    allowInsecure: true,
    allowLocal: true,
    dnsResolvers: [localDnsResolver]
  }, {
    contentTypeParser
  })

  const server = createServer((req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(200)
      res.end()
      return
    }

    if (req.url == null) {
      // this should never happen
      res.writeHead(400)
      res.end('Bad Request')
      return
    }

    log.trace('req.headers: %O', req.headers)
    const hostname = req.headers.host?.split(':')[0]
    const host = req.headers['x-forwarded-for'] ?? `${hostname}:${serverPort}`

    const fullUrlHref = req.headers.referer ?? `http://${host}${req.url}`
    log('fetching %s', fullUrlHref)

    const requestController = new AbortController()
    // we need to abort the request if the client disconnects
    req.on('close', () => {
      log('client disconnected, aborting request')
      requestController.abort()
    })

    void verifiedFetch(fullUrlHref, { redirect: 'manual', signal: requestController.signal, session: useSessions, allowInsecure: true, allowLocal: true }).then(async (resp) => {
      // loop over headers and set them on the response
      const headers: Record<string, string> = {}
      for (const [key, value] of resp.headers.entries()) {
        headers[key] = value
      }

      res.writeHead(resp.status, headers)
      if (resp.body == null) {
        // need to convert ArrayBuffer to Buffer or Uint8Array
        res.write(Buffer.from(await resp.arrayBuffer()))
      } else {
        // read the body of the response and write it to the response from the server
        const reader = resp.body.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }
          log('typeof value: %s', typeof value)

          res.write(Buffer.from(value))
        }
      }
      res.end()
    }).catch((e) => {
      log.error('Problem with request: %s', e.message, e)
      if (!res.headersSent) {
        res.writeHead(500)
      }
      res.end(`Internal Server Error: ${e.message}`)
    }).finally(() => {
      requestController.abort()
    })
  })

  server.listen(serverPort, () => {
    log(`Basic server listening on port ${serverPort}`)
  })

  return async () => {
    await new Promise<void>((resolve, reject) => {
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
