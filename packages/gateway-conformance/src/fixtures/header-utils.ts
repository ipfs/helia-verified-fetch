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
