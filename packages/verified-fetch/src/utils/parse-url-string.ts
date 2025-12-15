import { InvalidParametersError } from '@libp2p/interface'
import { peerIdFromCID, peerIdFromString } from '@libp2p/peer-id'
import { CID } from 'multiformats/cid'
import { decodeDNSLinkLabel, isInlinedDnsLink } from './dnslink-label.ts'
import { ipfsPathToUrl, ipfsUrlToUrl } from './ipfs-path-to-url.ts'

interface SubdomainMatchGroups {
  protocol: 'ipfs' | 'ipns'
  cidOrPeerIdOrDnsLink: string
}

export const SUBDOMAIN_GATEWAY_REGEX = /^(?<cidOrPeerIdOrDnsLink>[^/?]+)\.(?<protocol>ip[fn]s)\.([^/?]+)$/
const CODEC_LIBP2P_KEY = 0x72

function matchSubdomainGroupsGuard (groups?: null | { [key in string]: string; } | SubdomainMatchGroups): groups is SubdomainMatchGroups {
  const protocol = groups?.protocol

  if (protocol !== 'ipfs' && protocol !== 'ipns') {
    return false
  }

  const cidOrPeerIdOrDnsLink = groups?.cidOrPeerIdOrDnsLink

  if (cidOrPeerIdOrDnsLink == null) {
    return false
  }

  return true
}

export interface ParsedURL {
  url: URL,
  protocol: 'ipfs' | 'ipns'
  cidOrPeerIdOrDnsLink: string
  path: string[]
  query: Record<string, any>
  fragment: string
}

/**
 * If the caller has passed a case-sensitive identifier (like a base58btc
 * encoded CID or PeerId) in a case-insensitive location (like a subdomain),
 * be nice and return the original identifier from the passed string
 */
function findOriginalCidOrPeer (needle: string, haystack: string): string {
  const start = haystack.toLowerCase().indexOf(needle)

  if (start === -1) {
    return needle
  }

  return haystack.substring(start, start + needle.length)
}

function stringToUrl (urlString: string | URL): URL {
  if (urlString instanceof URL) {
    return urlString
  }

  // turn IPFS/IPNS path into gateway URL string
  if (urlString.startsWith('/ipfs/') || urlString.startsWith('/ipns/')) {
    urlString = ipfsPathToUrl(urlString)
  }

  // turn IPFS/IPNS URL into gateway URL string
  if (urlString.startsWith('ipfs://') || urlString.startsWith('ipns://')) {
    urlString = ipfsUrlToUrl(urlString)
  }

  if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
    return new URL(urlString)
  }

  throw new InvalidParametersError(`Invalid URL: ${urlString}`)
}

function toURL (urlString: string): URL {
  // validate url
  const url = stringToUrl(urlString)

  // test for subdomain gateway URL
  const subdomainMatch = url.hostname.match(SUBDOMAIN_GATEWAY_REGEX)

  if (matchSubdomainGroupsGuard(subdomainMatch?.groups)) {
    const groups = subdomainMatch.groups

    if (groups.protocol === 'ipns' && isInlinedDnsLink(groups.cidOrPeerIdOrDnsLink)) {
      // decode inline dnslink domain if present
      groups.cidOrPeerIdOrDnsLink = decodeDNSLinkLabel(groups.cidOrPeerIdOrDnsLink)
    }

    const cidOrPeerIdOrDnsLink = findOriginalCidOrPeer(groups.cidOrPeerIdOrDnsLink, urlString)

    // parse url as not http(s):// - this is necessary because URL makes
    // `.pathname` default to `/` for http URLs, even if no trailing slash was
    // present in the string URL and we need to be able to round-trip the user's
    // input while also maintaining a sane canonical URL for the resource. Phew.
    const wat = new URL(`not-${urlString}`)

    return new URL(`${groups.protocol}://${cidOrPeerIdOrDnsLink}${wat.pathname}${url.search}${url.hash}`)
  }

  // test for IPFS path gateway URL
  if (url.pathname.startsWith('/ipfs/')) {
    const parts = url.pathname.substring(6).split('/')
    const cid = parts.shift()

    if (cid == null) {
      throw new InvalidParametersError(`Path gateway URL ${urlString} had no CID`)
    }

    return new URL(`ipfs://${cid}${url.pathname.replace(`/ipfs/${cid}`, '')}${url.search}${url.hash}`)
  }

  // test for IPNS path gateway URL
  if (url.pathname.startsWith('/ipns/')) {
    const parts = url.pathname.substring(6).split('/')
    const name = parts.shift()

    if (name == null) {
      throw new InvalidParametersError(`Path gateway URL ${urlString} had no name`)
    }

    return new URL(`ipns://${name}${url.pathname.replace(`/ipns/${name}`, '')}${url.search}${url.hash}`)
  }

  throw new TypeError(`Invalid URL: ${urlString}, please use ipfs://, ipns://, or gateway URLs only`)
}

/**
 * Accepts the following url strings:
 *
 * - /ipfs/Qmfoo/path
 * - /ipns/Qmfoo/path
 * - ipfs://cid/path
 * - ipns://name/path
 * - http://cid.ipfs.example.com/path
 * - http://name.ipns.example.com/path
 * - http://example.com/ipfs/cid/path
 * - http://example.com/ipns/name/path
 */
export function parseURLString (urlString: string): URL {
  // validate url
  const url = toURL(urlString)

  // treat IPNS keys that do not parse as PeerIds as DNSLink
  if (url.protocol === 'ipns:') {
    try {
      peerIdFromString(url.hostname)
    } catch {
      url.protocol = 'dnslink:'
    }
  }

  if (url.protocol === 'ipfs:') {
    const cid = CID.parse(url.hostname)

    // special case - peer id encoded as a CID
    if (cid.code === CODEC_LIBP2P_KEY) {
      return new URL(`ipns://${peerIdFromCID(cid)}${url.pathname}${url.search}${url.hash}`)
    }
  }

  return url
}
