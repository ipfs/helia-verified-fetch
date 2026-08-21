import { base36 } from 'multiformats/bases/base36'
import { base58btc } from 'multiformats/bases/base58'
import { CID } from 'multiformats/cid'
import * as Digest from 'multiformats/hashes/digest'
import { CODEC_LIBP2P_KEY } from '../constants.ts'

/**
 * Percent-encode a single path segment for the `Ipfs-Uri` header value.
 *
 * Every byte of the segment's UTF-8 encoding that is outside the RFC 3986
 * unreserved set (ALPHA / DIGIT / "-" / "." / "_" / "~") is encoded as %XX
 * with uppercase hex, so the output is ASCII-only and byte-identical across
 * implementations. `encodeURIComponent` covers everything except the
 * sub-delims `!'()*` which are handled separately.
 */
function encodeSegment (segment: string): string {
  return encodeURIComponent(segment)
    .replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
}

/**
 * Percent-decode a raw URL path segment. Segments that are not valid
 * percent-encoding (e.g. a lone `%`) are used as-is.
 */
function decodeSegment (segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

/**
 * Resolve the dot segments of a decoded path: "." drops out and ".." removes
 * the segment before it. A ".." with nothing left to remove is discarded, so
 * the result can never climb above the content root.
 */
function resolveDotSegments (segments: string[]): string[] {
  const resolved: string[] = []

  for (const segment of segments) {
    if (segment === '.') {
      continue
    }

    if (segment === '..') {
      resolved.pop()

      continue
    }

    resolved.push(segment)
  }

  return resolved
}

/**
 * Convert a WHATWG URL pathname into the path part of an `Ipfs-Uri` value.
 * The URI path mirrors the content path the gateway resolved and served, so
 * it follows the same order of operations: each raw pathname segment is
 * percent-decoded once, which turns an encoded slash (%2F) into a path
 * separator, and only then are dot segments resolved. A "." or ".." can
 * therefore never reach the value. Every remaining segment is strictly
 * re-encoded and joined with "/": interior empty segments are dropped, a
 * trailing slash is kept, and an empty remainder produces no path at all.
 */
function toUriPath (pathname: string): string {
  if (pathname === '') {
    return ''
  }

  const decoded = pathname.split('/').map(decodeSegment).join('/')
  const segments = resolveDotSegments(decoded.split('/').filter(segment => segment !== ''))
  const trailingSlash = decoded.endsWith('/') ? '/' : ''

  if (segments.length === 0) {
    return trailingSlash
  }

  return `/${segments.map(encodeSegment).join('/')}${trailingSlash}`
}

/**
 * Canonical authority for an `ipfs://` URI: the CID re-encoded as a CIDv1 in
 * lowercase base32 (multibase prefix `b`). CIDv0 and other encodings of the
 * same CID normalize to the same string.
 */
function ipfsAuthority (host: string): string {
  return CID.parse(host).toV1().toString()
}

/**
 * Canonical authority for an `ipns://` URI naming a cryptographic IPNS name:
 * the root re-encoded as a CIDv1 in lowercase base36 (multibase prefix `k`).
 * Legacy base58btc peer id strings (`Qm...`, `12D3Koo...`) normalize to a
 * libp2p-key CIDv1 in base36. A root carrying any other multicodec is not an
 * IPNS Name, so there is no `ipns://` URI to report and the header is omitted.
 */
function ipnsAuthority (host: string): string | undefined {
  if (host.startsWith('Q') || host.startsWith('1')) {
    const digest = Digest.decode(base58btc.baseDecode(host))

    return CID.createV1(CODEC_LIBP2P_KEY, digest).toString(base36)
  }

  const cid = CID.parse(host)

  if (cid.code !== CODEC_LIBP2P_KEY) {
    return undefined
  }

  return cid.toV1().toString(base36)
}

/**
 * The `dnslink-name` form of the `ipns://` URI spec: two or more labels
 * separated by dots, each label 1 to 63 lowercase letters, digits and interior
 * hyphens, with no leading or trailing hyphen.
 *
 * @see https://specs.ipfs.tech/ipns-uri/#syntax
 */
const DNSLINK_NAME = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/

/**
 * Canonical authority for an `ipns://` URI naming a DNSLink: the dotted DNS
 * name as lowercase ASCII (A-labels for IDN), with a single trailing dot
 * stripped first. WHATWG URLs treat `dnslink:` as a non-special scheme so
 * the hostname keeps the case of the input; round-tripping through an
 * `http:` URL applies domain parsing which lowercases and converts IDN
 * labels to A-labels, but leaves malformed names such as `en..example.net`
 * alone. A result outside the `dnslink-name` form cannot be a DNSLink name so
 * the header is omitted.
 */
function dnsLinkAuthority (host: string): string | undefined {
  const name = decodeSegment(host).replace(/\.$/, '')
  const authority = new URL(`http://${name}`).hostname

  if (!DNSLINK_NAME.test(authority)) {
    return undefined
  }

  return authority
}

/**
 * Build the value of the `Ipfs-Uri` response header defined by IPIP-0548: a
 * single canonical `ipfs://` or `ipns://` URI equivalent to the requested
 * content path, before path traversal. The value never contains a query or a
 * fragment. Returns `undefined` when the content root cannot be normalized,
 * in which case the header is omitted.
 */
export function toIpfsUri (url: URL): string | undefined {
  try {
    if (url.protocol === 'ipfs:') {
      return `ipfs://${ipfsAuthority(url.hostname)}${toUriPath(url.pathname)}`
    }

    if (url.protocol === 'ipns:') {
      const authority = ipnsAuthority(url.hostname)

      return authority == null ? undefined : `ipns://${authority}${toUriPath(url.pathname)}`
    }

    if (url.protocol === 'dnslink:') {
      const authority = dnsLinkAuthority(url.hostname)

      return authority == null ? undefined : `ipns://${authority}${toUriPath(url.pathname)}`
    }
  } catch {
    // the content root could not be normalized, omit the header
  }

  return undefined
}
