import { InvalidParametersError } from '@libp2p/interface'
import { decodeDNSLinkLabel, isInlinedDnsLink } from './dnslink-label.ts'
import { ipfsPathToUrl, ipfsUrlToUrl } from './ipfs-path-to-url.ts'

interface SubdomainMatchGroups {
  protocol: 'ipfs' | 'ipns'
  cidOrPeerIdOrDnsLink: string
}

const SUBDOMAIN_GATEWAY_REGEX = /^(?<cidOrPeerIdOrDnsLink>[^/?]+)\.(?<protocol>ip[fn]s)\.([^/?]+)$/

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

function toQuery (query?: URLSearchParams): Record<string, any> {
  if (query == null) {
    return {}
  }

  const output: Record<string, any> = {}

  for (const [key, value] of query.entries()) {
    output[key] = value

    if (value === 'true') {
      output[key] = true
    }

    if (value === 'false') {
      output[key] = false
    }
  }

  return output
}

function stripLeadingHash (pathname: string): string {
  return stripLeading(pathname, '#')
}

function stripLeading (str: string, char: string): string {
  while (str.startsWith(char)) {
    str = str.substring(1)
  }

  return str
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

function toUrl (urlString: string): URL {
  // turn IPFS/IPNS path into gateway URL string
  if (urlString.startsWith('/ipfs/') || urlString.startsWith('/ipns/')) {
    urlString = ipfsPathToUrl(urlString)
  }

  // turn IPFS/IPNS URL into gateway URL string
  if (urlString.startsWith('ipfs://') || urlString.startsWith('ipns://')) {
    urlString = ipfsUrlToUrl(urlString)
  }

  // validate url
  return new URL(urlString)
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
export function parseURLString (urlString: string): ParsedURL {
  // validate url
  const url = toUrl(urlString)

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

    return {
      url: new URL(`${groups.protocol}://${cidOrPeerIdOrDnsLink}${wat.pathname}${url.search}${url.hash}`),
      protocol: groups.protocol,
      cidOrPeerIdOrDnsLink,
      path: url.pathname.split('/')
        .filter(str => str !== '')
        .map(str => decodeURIComponent(str)),
      query: toQuery(url.searchParams),
      fragment: stripLeadingHash(url.hash)
    }
  }

  // test for IPFS path gateway URL
  if (url.pathname.startsWith('/ipfs/')) {
    const parts = url.pathname.substring(6).split('/')
    const cid = parts.shift()

    if (cid == null) {
      throw new InvalidParametersError(`Path gateway URL ${urlString} had no CID`)
    }

    return {
      url: new URL(`ipfs://${cid}${url.pathname.replace(`/ipfs/${cid}`, '')}${url.search}${url.hash}`),
      protocol: 'ipfs',
      cidOrPeerIdOrDnsLink: cid,
      path: parts
        .filter(str => str !== '')
        .map(str => decodeURIComponent(str)),
      query: toQuery(url.searchParams),
      fragment: stripLeadingHash(url.hash)
    }
  }

  // test for IPNS path gateway URL
  if (url.pathname.startsWith('/ipns/')) {
    const parts = url.pathname.substring(6).split('/')
    const name = parts.shift()

    if (name == null) {
      throw new InvalidParametersError(`Path gateway URL ${urlString} had no name`)
    }

    return {
      url: new URL(`ipns://${name}${url.pathname.replace(`/ipns/${name}`, '')}${url.search}${url.hash}`),
      protocol: 'ipns',
      cidOrPeerIdOrDnsLink: name,
      path: parts
        .filter(str => str !== '')
        .map(str => decodeURIComponent(str)),
      query: toQuery(url.searchParams),
      fragment: stripLeadingHash(url.hash)
    }
  }

  throw new TypeError(`Invalid URL: ${urlString}, please use ipfs://, ipns://, or gateway URLs only`)
}
