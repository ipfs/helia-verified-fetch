interface CacheControlHeaderOptions {
  /**
   * This should be seconds as a number.
   *
   * See https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#response_directives
   */
  ttl?: number
  protocol: 'ipfs' | 'ipns'
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
  let headerValue: string
  if (protocol === 'ipfs') {
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

  if (headerValue != null) {
    response.headers.set('cache-control', headerValue)
  }
}

/**
 * This function returns the value of the `Content-Range` header for a given range.
 * If you know the total size of the body, pass it as `byteSize`
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Range
 */
export function getContentRangeHeader ({ byteStart, byteEnd, byteSize }: { byteStart: number | undefined, byteEnd: number | undefined, byteSize: number | undefined }): string {
  const total = byteSize ?? '*' // if we don't know the total size, we should use *

  if ((byteEnd ?? 0) >= (byteSize ?? Infinity)) {
    throw new Error('Invalid range: Range-end index is greater than or equal to the size of the file.')
  }
  if ((byteStart ?? 0) >= (byteSize ?? Infinity)) {
    throw new Error('Invalid range: Range-start index is greater than or equal to the size of the file.')
  }

  if (byteStart != null && byteEnd == null) {
    // only byteStart in range
    if (byteSize == null) {
      return `bytes */${total}`
    }
    return `bytes ${byteStart}-${byteSize - 1}/${byteSize}`
  }

  if (byteStart == null && byteEnd != null) {
    // only byteEnd in range
    if (byteSize == null) {
      return `bytes */${total}`
    }
    const end = byteSize - 1
    const start = end - byteEnd + 1

    return `bytes ${start}-${end}/${byteSize}`
  }

  if (byteStart == null && byteEnd == null) {
    // neither are provided, we can't return a valid range.
    return `bytes */${total}`
  }

  return `bytes ${byteStart}-${byteEnd}/${total}`
}
