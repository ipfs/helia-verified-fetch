import { CodeError } from '@libp2p/interface'
import type { SupportedBodyTypes } from '../types.js'

/**
 * Gets the body size of a given body if it's possible to calculate it synchronously.
 */
function syncBodySize (body: SupportedBodyTypes): number | null {
  if (typeof body === 'string') {
    return body.length
  }
  if (body instanceof ArrayBuffer || body instanceof Uint8Array) {
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
 * offset and length are 0-based, and the range is inclusive.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Range
 */
export function getContentRangeHeader ({ body, ...opts }: { offset?: number, length?: number, total?: number, body: SupportedBodyTypes }): string {
  const totalSizeNum = opts.total ?? syncBodySize(body)
  const rangeStart = opts.offset ?? 0
  let rangeEnd = opts.length

  if (rangeEnd == null) {
    if (totalSizeNum == null) {
      throw new CodeError('Cannot calculate content range without total size or length', 'ERR_INVALID_CONTENT_RANGE')
    }
    rangeEnd = totalSizeNum - rangeStart + 1
  }
  let end: number
  if (rangeStart != null && rangeEnd != null) {
    end = rangeStart + rangeEnd - 1
  } else {
    end = totalSizeNum ?? 0
  }
  const total = totalSizeNum ?? '*' // if we don't know the total size, we should use *

  return `bytes ${rangeStart}-${end}/${total}`
}
