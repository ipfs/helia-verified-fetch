import { getContentRangeHeader } from './response-headers.js'
import type { SupportedBodyTypes } from '../types.js'

function setField (response: Response, name: string, value: string | boolean): void {
  Object.defineProperty(response, name, {
    enumerable: true,
    configurable: false,
    set: () => {},
    get: () => value
  })
}

function setType (response: Response, value: 'basic' | 'cors' | 'error' | 'opaque' | 'opaqueredirect'): void {
  setField(response, 'type', value)
}

function setUrl (response: Response, value: string): void {
  setField(response, 'url', value)
}

function setRedirected (response: Response): void {
  setField(response, 'redirected', true)
}

export interface ResponseOptions extends ResponseInit {
  redirected?: boolean
}

export function okResponse (url: string, body?: SupportedBodyTypes, init?: ResponseOptions): Response {
  const response = new Response(body, {
    ...(init ?? {}),
    status: 200,
    statusText: 'OK'
  })

  if (init?.redirected === true) {
    setRedirected(response)
  }

  setType(response, 'basic')
  setUrl(response, url)

  return response
}

export function internalServerErrorResponse (url: string, body?: SupportedBodyTypes, init?: ResponseInit): Response {
  const response = new Response(body, {
    ...(init ?? {}),
    status: 500,
    statusText: 'Internal Server Error'
  })

  setType(response, 'basic')
  setUrl(response, url)

  return response
}

export function notSupportedResponse (url: string, body?: SupportedBodyTypes, init?: ResponseInit): Response {
  const response = new Response(body, {
    ...(init ?? {}),
    status: 501,
    statusText: 'Not Implemented'
  })
  response.headers.set('X-Content-Type-Options', 'nosniff') // see https://specs.ipfs.tech/http-gateways/path-gateway/#x-content-type-options-response-header

  setType(response, 'basic')
  setUrl(response, url)

  return response
}

export function notAcceptableResponse (url: string, body?: SupportedBodyTypes, init?: ResponseInit): Response {
  const response = new Response(body, {
    ...(init ?? {}),
    status: 406,
    statusText: 'Not Acceptable'
  })

  setType(response, 'basic')
  setUrl(response, url)

  return response
}

export function badRequestResponse (url: string, body?: SupportedBodyTypes, init?: ResponseInit): Response {
  const response = new Response(body, {
    ...(init ?? {}),
    status: 400,
    statusText: 'Bad Request'
  })

  setType(response, 'basic')
  setUrl(response, url)

  return response
}

export function movedPermanentlyResponse (url: string, location: string, init?: ResponseInit): Response {
  const response = new Response(null, {
    ...(init ?? {}),
    status: 301,
    statusText: 'Moved Permanently',
    headers: {
      ...(init?.headers ?? {}),
      location
    }
  })

  setType(response, 'basic')
  setUrl(response, url)

  return response
}

type RangeOptions = { offset: number, length: number, totalSize?: number } | { offset: number, length?: number, totalSize: number }

/**
 * Some caveats about range responses here:
 * * We only support single range requests (multi-range is optional), see https://specs.ipfs.tech/http-gateways/path-gateway/#range-request-header
 * * Range responses are only supported for unixfs and raw data, see https://specs.ipfs.tech/http-gateways/path-gateway/#range-request-header.
 *
 * If the user requests something other than unixfs or raw data, we should not call this method and ignore the range header (200 OK). See https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests#partial_request_responses
 *
 * TODO: Supporting multiple range requests will require additional changes to the `handleDagPb` and `handleRaw` functions in `src/verified-fetch.js`
 */
export function okRangeResponse (url: string, body: SupportedBodyTypes, range: RangeOptions, init?: ResponseOptions): Response {
  // if we know the full size of the body, we should use it in the content-range header. See https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Range
  let contentRangeHeader: string | undefined

  try {
    contentRangeHeader = getContentRangeHeader({ body, total: range.totalSize, offset: range.offset, length: range.length })
  } catch (e) {
    return badRangeResponse(url, body, init)
  }

  const response = new Response(body, {
    ...(init ?? {}),
    status: 206,
    statusText: 'Partial Content',
    headers: {
      ...(init?.headers ?? {}),
      'content-range': contentRangeHeader
    }
  })

  if (init?.redirected === true) {
    setRedirected(response)
  }

  setType(response, 'basic')
  setUrl(response, url)

  return response
}

/**
 * We likely need to catch errors handled by upstream helia libraries if range-request throws an error. Some examples:
 * * The range is out of bounds
 * * The range is invalid
 * * The range is not supported for the given type
 */
export function badRangeResponse (url: string, body?: SupportedBodyTypes, init?: ResponseInit): Response {
  const response = new Response(body, {
    ...(init ?? {}),
    status: 416,
    statusText: 'Requested Range Not Satisfiable'
  })

  setType(response, 'basic')
  setUrl(response, url)

  return response
}
