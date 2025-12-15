import itToBrowserReadableStream from 'it-to-browser-readablestream'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { rangeToOffsetAndLength } from './get-offset-and-length.ts'
import { getContentRangeHeader } from './response-headers.ts'
import type { SupportedBodyTypes, ContentType } from '../index.js'
import type { Range, RangeHeader } from './get-range-header.ts'

function setField (response: Response, name: string, value: string | boolean): void {
  Object.defineProperty(response, name, {
    enumerable: true,
    configurable: false,
    set: () => {},
    get: () => value
  })
}

function setType (response: Response, value: 'basic' | 'cors' | 'error' | 'opaque' | 'opaqueredirect'): void {
  if (response.type !== value) {
    setField(response, 'type', value)
  }
}

function setUrl (response: Response, value: string | URL): void {
  value = value.toString()
  const fragmentStart = value.indexOf('#')

  if (fragmentStart > -1) {
    value = value.substring(0, fragmentStart)
  }

  if (response.url !== value) {
    setField(response, 'url', value)
  }
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

/**
 * A 504 Gateway Timeout for when a request made to an upstream server timed out
 */
export function gatewayTimeoutResponse (url: string, body?: SupportedBodyTypes, init?: ResponseInit): Response {
  const response = new Response(body, {
    ...(init ?? {}),
    status: 504,
    statusText: 'Gateway Timeout'
  })

  setType(response, 'basic')
  setUrl(response, url)

  return response
}

/**
 * A 502 Bad Gateway is for when an invalid response was received from an
 * upstream server.
 */
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

export function notAcceptableResponse (url: string | URL, acceptable: ContentType[], init?: ResponseInit): Response {
  const headers = new Headers(init?.headers)
  headers.set('content-type', 'application/json')

  const response = new Response(JSON.stringify({
    acceptable: acceptable.map(contentType => contentType.mediaType)
  }), {
    ...(init ?? {}),
    status: 406,
    statusText: 'Not Acceptable',
    headers
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

export interface PartialContent {
  /**
   * Yield data from the content starting at `start` (or 0) inclusive and ending
   * at `end` exclusive
   */
  (offset: number, length: number): AsyncGenerator<Uint8Array>
}

export function partialContentResponse (url: string, getSlice: PartialContent, range: RangeHeader, documentSize: number | bigint, init?: ResponseOptions): Response {
  let response: Response

  if (range.ranges.length === 1) {
    response = singleRangeResponse(url, getSlice, range.ranges[0], documentSize, init)
  } else if (range.ranges.length > 1) {
    response = multiRangeResponse(url, getSlice, range, documentSize, init)
  } else {
    return notSatisfiableResponse(url, documentSize)
  }

  if (init?.redirected === true) {
    setRedirected(response)
  }

  setType(response, 'basic')
  setUrl(response, url)

  return response
}

function singleRangeResponse (url: string, getSlice: PartialContent, range: Range, documentSize: number | bigint, init?: ResponseOptions): Response {
  try {
    // create headers object with any initial headers from init
    const headers = new Headers(init?.headers)
    const { offset, length } = rangeToOffsetAndLength(documentSize, range.start, range.end)

    headers.set('content-length', `${length}`)

    // see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Range
    headers.set('content-range', getContentRangeHeader(documentSize, range.start, range.end))

    const stream = itToBrowserReadableStream(getSlice(offset, length))

    return new Response(stream, {
      ...(init ?? {}),
      status: 206,
      statusText: 'Partial Content',
      headers
    })
  } catch (err: any) {
    if (err.name === 'InvalidRangeError') {
      return notSatisfiableResponse(url, documentSize, init)
    }

    return internalServerErrorResponse(url, '', init)
  }
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Range_requests
 */
function multiRangeResponse (url: string, getSlice: PartialContent, range: RangeHeader, documentSize: number | bigint, init?: ResponseOptions): Response {
  // create headers object with any initial headers from init
  const headers = new Headers(init?.headers)

  const contentType = headers.get('content-type')

  if (contentType == null) {
    throw new Error('Content-Type header must be set')
  }

  headers.delete('content-type')

  let contentLength = 0n

  // calculate content range based on range headers
  const rangeHeaders = range.ranges.map(({ start, end }) => {
    const header = uint8ArrayFromString([
      `--${range.multipartBoundary}`,

      // content-type of multipart part
      `Content-Type: ${contentType}`,

      // see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Range
      `Content-Range: ${getContentRangeHeader(documentSize, start, end)}`,
      '',
      ''
    ].join('\r\n'))

    contentLength += BigInt(header.byteLength) + (BigInt(end ?? documentSize) - BigInt(start ?? 0))

    return header
  })

  const trailer = uint8ArrayFromString([
    `--${range.multipartBoundary}--`,
    ''
  ].join('\r\n'))

  contentLength += BigInt(trailer.byteLength)

  // content length is the expected length of all multipart parts
  headers.set('content-length', `${contentLength}`)

  // content type of response is multipart
  headers.set('content-type', `multipart/byteranges; boundary=${range.multipartBoundary}`)

  const stream = itToBrowserReadableStream(async function * () {
    for (let i = 0; i < rangeHeaders.length; i++) {
      yield rangeHeaders[i]

      const { offset, length } = rangeToOffsetAndLength(documentSize, range.ranges[i].start, range.ranges[i].end)
      yield * getSlice(offset, length)

      yield uint8ArrayFromString('\r\n')
    }

    yield trailer
  }())

  return new Response(stream, {
    ...(init ?? {}),
    status: 206,
    statusText: 'Partial Content',
    headers
  })
}

/**
 * We likely need to catch errors handled by upstream helia libraries if
 * range-request throws an error. Some examples:
 *
 * - The range is out of bounds
 * - The range is invalid
 * - The range is not supported for the given type
 */
export function notSatisfiableResponse (url: string, documentSize?: number | bigint | string, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers)

  if (documentSize != null) {
    headers.set('content-range', `bytes */${documentSize}`)
  }

  const response = new Response('Range Not Satisfiable', {
    ...init,
    headers,
    status: 416,
    statusText: 'Range Not Satisfiable'
  })

  setType(response, 'basic')
  setUrl(response, url)

  return response
}

/**
 * Error to indicate that request was formally correct, but Gateway is unable to
 * return requested data under the additional (usually cache-related) conditions
 * sent by the client.
 *
 * @see https://specs.ipfs.tech/http-gateways/path-gateway/#412-precondition-failed
 */
export function preconditionFailedResponse (url: string, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers)

  const response = new Response('Precondition Failed', {
    ...init,
    headers,
    status: 412,
    statusText: 'Precondition Failed'
  })

  setType(response, 'basic')
  setUrl(response, url)

  return response
}
