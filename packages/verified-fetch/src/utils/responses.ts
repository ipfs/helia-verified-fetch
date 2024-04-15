import type { ByteRangeContext } from './byte-range-context'
import type { SupportedBodyTypes } from '../types.js'
import type { Logger } from '@libp2p/interface'

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

export function badGatewayResponse (url: string, body?: SupportedBodyTypes, init?: ResponseInit): Response {
  const response = new Response(body, {
    ...(init ?? {}),
    status: 502,
    statusText: 'Bad Gateway'
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

export function notFoundResponse (url: string, body?: SupportedBodyTypes, init?: ResponseInit): Response {
  const response = new Response(body, {
    ...(init ?? {}),
    status: 404,
    statusText: 'Not Found'
  })

  setType(response, 'basic')
  setUrl(response, url)

  return response
}

/**
 * if body is an Error, it will be converted to a string containing the error message.
 */
export function badRequestResponse (url: string, body?: SupportedBodyTypes | Error, init?: ResponseInit): Response {
  if (body instanceof Error) {
    body = body.message
  }
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
  log?: Logger
}

export function okRangeResponse (url: string, body: SupportedBodyTypes, { byteRangeContext, log }: RangeOptions, init?: ResponseOptions): Response {
  if (!byteRangeContext.isRangeRequest) {
    return okResponse(url, body, init)
  }

  if (!byteRangeContext.isValidRangeRequest) {
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
  } catch (e: any) {
    log?.error('failed to create range response', e)
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
