interface CacheControlHeaderOptions {
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
