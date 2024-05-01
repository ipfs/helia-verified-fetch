import { createServer } from 'node:http'
import { logger } from '@libp2p/logger'
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
}

export async function startBasicServer ({ kuboGateway, serverPort }: BasicServerOptions): Promise<() => Promise<void>> {
  kuboGateway = kuboGateway ?? process.env.KUBO_GATEWAY
  if (kuboGateway == null) {
    throw new Error('options.kuboGateway or KUBO_GATEWAY env var is required')
  }

  const verifiedFetch = await createVerifiedFetch({
    gateways: [kuboGateway],
    routers: [kuboGateway]
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

    log('req.headers: %O', req.headers)
    const hostname = req.headers.host?.split(':')[0]
    const host = req.headers['x-forwarded-for'] ?? `${hostname}:${serverPort}`

    const fullUrlHref = req.headers.referer ?? `http://${host}${req.url}`
    log('fetching %s', fullUrlHref)

    void verifiedFetch(fullUrlHref, { redirect: 'manual' }).then(async (resp) => {
      // loop over headers and set them on the response
      const headers: Record<string, string> = {}
      for (const [key, value] of resp.headers.entries()) {
        headers[key] = value
      }

      // TODO: Figure out if we want to set these automatically on @helia/verified-fetch...
      headers['Access-Control-Allow-Origin'] = '*'
      headers['Access-Control-Allow-Headers'] = 'Content-Type,Range,User-Agent,X-Requested-With'
      headers['Access-Control-Allow-Methods'] = 'GET,HEAD,OPTIONS'
      res.writeHead(resp.status, headers)
      if (resp.body == null) {
        res.write(await resp.arrayBuffer())
      } else {
        // read the body of the response and write it to the response from the server
        const reader = resp.body.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }
          res.write(Buffer.from(value))
        }
      }
      res.end()
    }).catch((e) => {
      log.error('Problem with request: %s', e.message)
      // res.writeHead(500)
      res.end(`Internal Server Error: ${e.message}`)
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
