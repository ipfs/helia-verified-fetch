import type { ContentType } from '../index.ts'
import type { Range } from './get-range-header.ts'
import type { CID } from 'multiformats/cid'

interface GetETagArg {
  /**
   * The CID that was resolved to the content in the response
   */
  cid: CID

  /**
   * The content type of the response
   */
  contentType: ContentType

  /**
   * Any byte ranges, if specified
   */
  ranges?: Range[]

  /**
   * A custom prefix to use for the content of the etag
   */
  contentPrefix?: string
}

/**
 * We use strong Etags for immutable responses and weak ones (prefixed with W/ )
 * for mutable/generated ones (ipns, car, tar, and generated HTML).
 *
 * Block and car responses should have different etags to deserialized ones, so
 * you can add a prefix like we do in the existing gateway.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag
 * @see https://specs.ipfs.tech/http-gateways/path-gateway/#etag-response-header
 */
export function getETag ({ cid, contentType, ranges, contentPrefix }: GetETagArg): string {
  const prefix = contentType.immutable ? '' : 'W/'
  let suffix = contentType.etag

  if (ranges?.length != null && ranges?.length > 0) {
    const validRanges = ranges
      .filter(range => range.start != null || range.end != null)

    if (validRanges.length > 0) {
      suffix += '.' + validRanges
        .map(range => `${range.start ?? 0}-${range.end ?? 'N'}`)
        .join(',')
    }
  }

  return `${prefix}"${contentPrefix ?? ''}${cid.toString()}${suffix}"`
}
