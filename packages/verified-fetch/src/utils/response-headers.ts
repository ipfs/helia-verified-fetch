import type { SupportedBodyTypes } from '../types.js'

/**
 * Gets the body size of a given body if it's possible to calculate it synchronously.
 */
function syncBodySize (body: SupportedBodyTypes): number | null {
  if (typeof body === 'string') {
    return body.length
  }
  if (body instanceof ArrayBuffer) {
    return body.byteLength
  }
  if (body instanceof Blob) {
    return body.size
  }
  if (body instanceof ReadableStream) {
    return null
  }
  return null
}

/**
 * This function returns the value of the `Content-Range` header for a given range.
 * If you know the total size of the body, you should pass it in the `options` object.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Range
 */
export function getContentRangeHeader (start: number, end: number, options: { total?: number, body: SupportedBodyTypes }): string {
  const total = options.total ?? syncBodySize(options.body) ?? '*' // if we don't know the total size, we should use *
  return `bytes ${start}-${end}/${total}`
}
