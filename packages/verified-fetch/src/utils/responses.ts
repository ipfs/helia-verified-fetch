import type { ByteRangeContext } from './byte-range-context.js'
import type { SupportedBodyTypes } from '../index.js'
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
  const fragmentStart = value.indexOf('#')

  if (fragmentStart > -1) {
    value = value.substring(0, fragmentStart)
  }

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
  response.headers.set('X-Content-Type-Options', 'nosniff') // see https://specs.ipfs.tech/http-gateways/path-gateway/#x-content-type-options-response-header

  setType(response, 'basic')
  setUrl(response, url)

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

export function notImplementedResponse (url: string, body?: SupportedBodyTypes, init?: ResponseInit): Response {
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

function isArrayOfErrors (body: unknown | Error | Error[]): body is Error[] {
  return Array.isArray(body) && body.every(e => e instanceof Error)
}

export function badRequestResponse (url: string, errors: Error | Error[], init?: ResponseInit): Response {
  // stacktrace of the single error, or the stacktrace of the last error in the array
  let stack: string | undefined
  let convertedErrors: Array<{ message: string, stack: string }> | undefined
  if (isArrayOfErrors(errors)) {
    stack = errors[errors.length - 1].stack
    convertedErrors = errors.map(e => ({ message: e.message, stack: e.stack ?? '' }))
  } else if (errors instanceof Error) {
    stack = errors.stack
    convertedErrors = [{ message: errors.message, stack: errors.stack ?? '' }]
  }

  const bodyJson = JSON.stringify({
    stack,
    errors: convertedErrors
  })

  const response = new Response(bodyJson, {
    status: 400,
    statusText: 'Bad Request',
    ...(init ?? {}),
    headers: {
      ...(init?.headers ?? {}),
      'Content-Type': 'application/json'
    }
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
    // Create headers object with any initial headers from init
    const headers = new Headers(init?.headers)

    // For multipart responses, we should use the content-type header instead of content-range
    const multipartContentType = byteRangeContext.getContentType()

    if (multipartContentType != null) {
      headers.set('content-type', multipartContentType)
    } else {
      if (byteRangeContext.isMultiRangeRequest) {
        headers.set('content-type', 'multipart/byteranges')
      } else {
        headers.set('content-range', byteRangeContext.contentRangeHeaderValue)
      }
    }

    response = new Response(body, {
      ...(init ?? {}),
      status: 206,
      statusText: 'Partial Content',
      headers
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

  return response
}

/**
 * We likely need to catch errors handled by upstream helia libraries if range-request throws an error. Some examples:
 * - The range is out of bounds
 * - The range is invalid
 * - The range is not supported for the given type
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
