import type { Logger } from '@libp2p/logger'
import type { IncomingHttpHeaders } from 'undici/types/header'

export function convertNodeJsHeadersToFetchHeaders (headers: IncomingHttpHeaders): HeadersInit {
  const fetchHeaders = new Headers()
  for (const [key, value] of Object.entries(headers)) {
    if (value == null) {
      continue
    }
    if (Array.isArray(value)) {
      for (const v of value) {
        fetchHeaders.append(key, v)
      }
    } else {
      fetchHeaders.append(key, value)
    }
  }
  return fetchHeaders
}

export interface ConvertFetchHeadersToNodeJsHeadersOptions {
  resp: Response
  log: Logger
  fixingGwcAnnoyance: boolean
  serverPort: number
}

export function convertFetchHeadersToNodeJsHeaders ({ resp, log, fixingGwcAnnoyance, serverPort }: ConvertFetchHeadersToNodeJsHeadersOptions): IncomingHttpHeaders {
  const headers: Record<string, string> = {}
  for (const [key, value] of resp.headers.entries()) {
    if (fixingGwcAnnoyance) {
      log.trace('need to fix GWC annoyance.')
      if (value.includes(`localhost:${serverPort}`)) {
        const newValue = value.replace(`localhost:${serverPort}`, 'localhost')
        log.trace('fixing GWC annoyance. Replacing Header[%s] value of "%s" with "%s"', key, value, newValue)
        // we need to fix any Location, or other headers that have localhost without port in them.
        headers[key] = newValue
      } else {
        log.trace('NOT fixing GWC annoyance. Setting Header[%s] value of "%s"', key, value)
        headers[key] = value
      }
    } else {
      headers[key] = value
    }
  }
  return headers
}
