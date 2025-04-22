import type { RequestFormatShorthand } from '../types.js'
import type { CID } from 'multiformats/cid'

interface GetETagArg {
  cid: CID
  reqFormat?: RequestFormatShorthand
  rangeStart?: number
  rangeEnd?: number
  /**
   * Weak Etag is used when we can't guarantee byte-for-byte-determinism (generated, or mutable content).
   * Some examples:
   * - IPNS requests
   * - CAR streamed with blocks in non-deterministic order
   * - TAR streamed with files in non-deterministic order
   */
  weak?: boolean

  /**
   * A custom prefix to use for the content of the etag. This is needed for some cases (like dir-index-html) where we need to use a custom prefix for the etag.
   */
  contentPrefix?: string
}

const getPrefix = ({ weak, reqFormat }: Partial<GetETagArg>): string => {
  if (reqFormat === 'tar' || reqFormat === 'car' || reqFormat === 'ipns-record' || weak === true) {
    return 'W/'
  }
  return ''
}

const getFormatSuffix = ({ reqFormat }: Partial<GetETagArg>): string => {
  if (reqFormat == null) {
    return ''
  }
  if (reqFormat === 'tar') {
    return '.x-tar'
  }

  return `.${reqFormat}`
}

/**
 * etag
 * you need to wrap cid  with ""
 * we use strong Etags for immutable responses and weak one (prefixed with W/ ) for mutable/generated ones (ipns, car, tar, and generated HTML).
 * block and car responses should have different etag than deserialized one, so you can add some prefix like we do in existing gateway
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag
 * @see https://specs.ipfs.tech/http-gateways/path-gateway/#etag-response-header
 */
export function getETag ({ cid, reqFormat, weak, rangeStart, rangeEnd, contentPrefix }: GetETagArg): string {
  const prefix = getPrefix({ weak, reqFormat })
  let suffix = getFormatSuffix({ reqFormat })
  if (rangeStart != null || rangeEnd != null) {
    suffix += `.${rangeStart ?? '0'}-${rangeEnd ?? 'N'}`
  }

  return `${prefix}"${contentPrefix ?? ''}${cid.toString()}${suffix}"`
}
