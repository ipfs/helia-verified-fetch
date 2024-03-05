import { type CatOptions } from '@helia/unixfs'
import { CodeError } from '@libp2p/interface'
import { type ExporterOptions } from 'ipfs-unixfs-exporter'

export function getHeader (headers: HeadersInit | undefined, header: string): string | undefined {
  if (headers == null) {
    return undefined
  }
  if (headers instanceof Headers) {
    return headers.get(header) ?? undefined
  }
  if (Array.isArray(headers)) {
    const entry = headers.find(([key]) => key.toLowerCase() === header.toLowerCase())
    return entry?.[1]
  }
  const key = Object.keys(headers).find(k => k.toLowerCase() === header.toLowerCase())
  if (key == null) {
    return undefined
  }

  return headers[key]
}

/**
 * Type abstraction that will break the build if the supported range options change.
 */
export interface HeliaRangeOptions extends Pick<ExporterOptions | CatOptions, 'offset' | 'length'> {
  suffixLength?: number
}

/**
 * Converts a range request header into helia/unixfs supported range options
 * Note that the gateway specification says we "MAY" support multiple ranges (https://specs.ipfs.tech/http-gateways/path-gateway/#range-request-header) but we don't
 *
 * Also note that @helia/unixfs and ipfs-unixfs-exporter expect length and offset to be numbers, the range header is a string, and the size of the resource is likely a bigint.
 *
 * SUPPORTED:
 * Range: bytes=<range-start>-<range-end>
 * Range: bytes=<range-start>-
 * Range: bytes=-<suffix-length> // must pass size so we can calculate the offset
 *
 * NOT SUPPORTED:
 * Range: bytes=<range-start>-<range-end>, <range-start>-<range-end>
 * Range: bytes=<range-start>-<range-end>, <range-start>-<range-end>, <range-start>-<range-end>
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Range#directives
 */
export function getRequestRange (headers: Headers | HeadersInit | undefined, size?: bigint): HeliaRangeOptions | undefined {
  const range = getHeader(headers, 'Range')
  if (range == null) {
    return undefined
  }

  /**
   * Range: bytes=<start>-<end> | bytes=<start2>- | bytes=-<end2>
   */
  const match = range.match(/^bytes=((?<start>\d+)-(?<end>\d+)|(?<start2>\d+)-|-(?<end2>\d+))$/)
  if (match?.groups == null) {
    throw new CodeError('ERR_INVALID_RANGE_REQUEST', 'Invalid range request')
  }
  const { start, end, start2, end2 } = match.groups

  let offset: number | undefined
  let length: number | undefined
  let suffixLength: number | undefined
  if (end2 != null) {
    if (size == null) {
      suffixLength = Number(end2)
    } else {
      const stop = BigInt(end2)
      offset = Number(size - stop)
      length = Number(stop)
    }
  } else if (start2 != null) {
    offset = parseInt(start2)
  } else {
    offset = parseInt(start)
    length = parseInt(end) - offset + 1
  }

  return {
    offset,
    length,
    suffixLength
  }
}
