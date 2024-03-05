import type { ByteRangeContext } from './byte-range-context'
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
  response.headers.set('Accept-Ranges', 'bytes')

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

interface RangeOptions {
  byteRangeContext: ByteRangeContext
}

export function okRangeResponse (url: string, body: SupportedBodyTypes, { byteRangeContext }: RangeOptions, init?: ResponseOptions): Response {
  if (!byteRangeContext.isRangeRequest) {
    return okResponse(url, body, init)
  }

  if (!byteRangeContext.isValidRangeRequest) {
    // eslint-disable-next-line no-console
    console.error('Invalid range request', byteRangeContext)
    return badRangeResponse(url, body, init)
  }

  let response: Response
  try {
    response = new Response(body, {
      ...(init ?? {}),
      status: 206,
      statusText: 'Partial Content',
      headers: {
        ...(init?.headers ?? {}),
        'content-range': byteRangeContext.contentRangeHeaderValue
      }
    })
  } catch (e) {
    // TODO: should we return a different status code here?
    // eslint-disable-next-line no-console
    console.error('Invalid range request', e)
    return badRangeResponse(url, body, init)
  }

  if (init?.redirected === true) {
    setRedirected(response)
  }

  setType(response, 'basic')
  setUrl(response, url)
  response.headers.set('Accept-Ranges', 'bytes')

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
