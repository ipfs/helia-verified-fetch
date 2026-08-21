import { toIPFSPath } from './ipfs-url-to-ipfs-path.ts'

/**
 * True when every byte of the UTF-8 encoding of `value` is HTAB (0x09), SP
 * (0x20) or visible ASCII (0x21-0x7E), the only bytes an HTTP field value can
 * carry. Any code point above 0x7E encodes to bytes that are all above 0x7F,
 * so testing code points is equivalent to testing the encoded bytes.
 */
function isFieldValue (value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)

    if (code !== 0x09 && (code < 0x20 || code > 0x7e)) {
      return false
    }
  }

  return true
}

/**
 * Build the value of the deprecated `x-ipfs-path` response header: the content
 * path for the requested URL, with the percent-encoding of the request target
 * removed. Returns `undefined` when that path contains a byte that cannot be
 * carried by an HTTP field value, in which case the header must be omitted
 * rather than sent with the offending bytes mangled or dropped.
 *
 * @see https://github.com/ipfs/specs/pull/548
 */
export function toXIpfsPath (url: URL): string | undefined {
  const ipfsPath = toIPFSPath(url)

  return isFieldValue(ipfsPath) ? ipfsPath : undefined
}
