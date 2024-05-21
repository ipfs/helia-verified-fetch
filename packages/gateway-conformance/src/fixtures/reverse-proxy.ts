import { request, createServer, type RequestOptions, type IncomingMessage, type ServerResponse } from 'node:http'
import { connect } from 'node:net'
import { logger } from '@libp2p/logger'

const log = logger('reverse-proxy')

let TARGET_HOST: string
let backendPort: number
let proxyPort: number
let subdomain: undefined | string
let prefixPath: undefined | string
let disableTryFiles: boolean
let X_FORWARDED_HOST: undefined | string

const makeRequest = (options: RequestOptions, req: IncomingMessage, res: ServerResponse & { req: IncomingMessage }, attemptRootFallback = false): void => {
  options.headers = options.headers ?? {}
  options.headers.Host = TARGET_HOST
  const clientIp = req.socket.remoteAddress
  options.headers['X-Forwarded-For'] = req.headers.host ?? clientIp

  // override path to include prefixPath if set
  if (prefixPath != null) {
    options.path = `${prefixPath}${options.path}`
  }
  if (subdomain != null) {
    options.headers.Host = `${subdomain}.${TARGET_HOST}`
  }
  if (X_FORWARDED_HOST != null) {
    options.headers['X-Forwarded-Host'] = X_FORWARDED_HOST
  }

  // log where we're making the request to
  log('Proxying request to %s:%s%s', options.headers.Host, options.port, options.path)

  const proxyReq = request(options, (proxyRes) => {
    if (!disableTryFiles && proxyRes.statusCode === 404) { // poor mans attempt to implement nginx style try_files
      if (!attemptRootFallback) {
        // Split the path and pop the last segment
        const pathSegments = options.path?.split('/') ?? []
        const lastSegment = pathSegments.pop() ?? ''

        // Attempt to request the last segment at the root
        makeRequest({ ...options, path: `/${lastSegment}` }, req, res, true)
      } else {
        // If already attempted a root fallback, serve index.html
        makeRequest({ ...options, path: '/index.html' }, req, res)
      }
    } else {
      // setCommonHeaders(res)
      if (proxyRes.statusCode == null) {
        log.error('No status code received from proxy')
        res.writeHead(500)
        res.end('Internal Server Error')
        return
      }
      res.writeHead(proxyRes.statusCode, proxyRes.headers)
      proxyRes.pipe(res, { end: true })
    }
  })

  req.pipe(proxyReq, { end: true })

  proxyReq.on('error', (e) => {
    log.error(`Problem with request: ${e.message}`)
    res.writeHead(500)
    res.end(`Internal Server Error: ${e.message}`)
  })

  proxyReq.on('close', () => {
    log.trace('Proxy request closed; ending response')
    res.end()
  })
}

export interface ReverseProxyOptions {
  targetHost?: string
  backendPort?: number
  proxyPort?: number
  subdomain?: string
  prefixPath?: string
  disableTryFiles?: boolean
  xForwardedHost?: string
}
export async function startReverseProxy (options?: ReverseProxyOptions): Promise<() => Promise<void>> {
  TARGET_HOST = options?.targetHost ?? process.env.TARGET_HOST ?? 'localhost'
  backendPort = options?.backendPort ?? Number(process.env.BACKEND_PORT ?? 3000)
  proxyPort = options?.proxyPort ?? Number(process.env.PROXY_PORT ?? 3333)
  subdomain = options?.subdomain ?? process.env.SUBDOMAIN
  prefixPath = options?.prefixPath ?? process.env.PREFIX_PATH
  disableTryFiles = options?.disableTryFiles ?? process.env.DISABLE_TRY_FILES === 'true'
  X_FORWARDED_HOST = options?.xForwardedHost ?? process.env.X_FORWARDED_HOST

  const proxyServer = createServer((req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(200)
      res.end()
      return
    }
    log('req.headers: %O', req.headers)

    const options: RequestOptions = {
      hostname: TARGET_HOST,
      port: backendPort,
      path: req.url,
      method: req.method,
      headers: { ...req.headers }
    }

    makeRequest(options, req, res)
  })

  proxyServer.listen(proxyPort, () => {
    log(`Proxy server listening on port ${proxyPort}`)
  })

  return async function stopReverseProxy (): Promise<void> {
    log('Stopping...')
    await new Promise<void>((resolve, reject) => {
      // no matter what happens, we need to kill the server
      proxyServer.closeAllConnections()
      log('Closed all connections')
      proxyServer.close((err: any) => {
        if (err != null) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
}
