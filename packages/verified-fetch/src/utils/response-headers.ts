import { InvalidRangeError } from '../errors.js'
import type { CID } from 'multiformats/cid'

interface CacheControlHeaderOptions {
  /**
   * This should be seconds as a number.
   *
   * See https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#response_directives
   */
  ttl?: number
  protocol: string
  response: Response
}

/**
 * Implementations may place an upper bound on any TTL received, as noted in Section 8 of [rfc2181].
 * If TTL value is unknown, implementations should not send a Cache-Control
 * No matter if TTL value is known or not, implementations should always send a Last-Modified header with the timestamp of the record resolution.
 *
 * @see https://specs.ipfs.tech/http-gateways/path-gateway/#cache-control-response-header
 */
export function setCacheControlHeader ({ ttl, protocol, response }: CacheControlHeaderOptions): void {
  if (response.headers.has('cache-control')) {
    // don't set the header if it's already set by a plugin
    return
  }

  let headerValue: string

  if (protocol === 'ipfs:') {
    headerValue = 'public, max-age=29030400, immutable'
  } else if (ttl == null) {
    /**
     * default limit for unknown TTL: "use 5 minute as default fallback when it is not available."
     *
     * @see https://github.com/ipfs/boxo/issues/329#issuecomment-1995236409
     */
    headerValue = 'public, max-age=300'
  } else {
    headerValue = `public, max-age=${ttl}`
  }

  response.headers.set('cache-control', headerValue)
}

/**
 * This function returns the value of the `Content-Range` header for a given
 * range.
 *
 * If you know the total size of the body, pass it as `byteSize`
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Range
 */
export function getContentRangeHeader (byteSize: number | bigint | string, byteStart?: number | bigint | string, byteEnd?: number | bigint | string): string {
  if (byteStart != null) {
    byteStart = BigInt(byteStart)
  }

  if (byteEnd != null) {
    byteEnd = BigInt(byteEnd)
  }

  // if we don't know the total size, we should use *
  const total = BigInt(byteSize)

  // validate start/end are not outside total size
  if ((byteEnd ?? 0n) >= total) {
    throw new InvalidRangeError('Invalid range: Range-end index is greater than or equal to the size of the file.')
  }

  if ((byteStart ?? 0n) >= total) {
    throw new InvalidRangeError('Invalid range: Range-start index is greater than or equal to the size of the file.')
  }

  let range = '*'

  if (byteStart == null) {
    if (byteEnd != null) {
      if (byteEnd < 0n) {
        range = `${total + byteEnd}-${total - 1n}`
      } else {
        range = `0-${byteEnd}`
      }
    }
  } else {
    if (byteEnd == null) {
      let end = '*'

      if (byteSize != null) {
        end = `${total - 1n}`
      }

      range = `${byteStart}-${end}`
    } else {
      range = `${byteStart}-${byteEnd}`
    }
  }

  return `bytes ${range}/${total}`
}
