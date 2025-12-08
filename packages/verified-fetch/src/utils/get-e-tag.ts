import type { ContentType } from '../index.ts'
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
   * Where the byte range starts, if specified
   */
  rangeStart?: number

  /**
   * Where the byte range ends, if specified
   */
  rangeEnd?: number

  /**
   * A custom prefix to use for the content of the etag. This is needed for some
   * cases (like dir-index-html) where we need to use a custom prefix for the
   * etag.
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
export function getETag ({ cid, contentType, rangeStart, rangeEnd, contentPrefix }: GetETagArg): string {
  const prefix = contentType.immutable ? '' : 'W/'
  let suffix = contentType.suffix

  if (rangeStart != null || rangeEnd != null) {
    suffix += `.${rangeStart ?? '0'}-${rangeEnd ?? 'N'}`
  }

  return `${prefix}"${contentPrefix ?? ''}${cid.toString()}${suffix}"`
}
