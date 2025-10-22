const URL_REGEX = /^(?<protocol>ip[fn]s):\/\/(?<cidOrPeerIdOrDnsLink>[^/?]+)\/?(?<path>[^?]*)\??(?<query>.*)$/
const PATH_REGEX = /^\/(?<protocol>ip[fn]s)\/(?<cidOrPeerIdOrDnsLink>[^/?]+)\/?(?<path>[^?]*)\??(?<query>.*)$/
const PATH_GATEWAY_REGEX = /^https?:\/\/(.*[^/])\/(?<protocol>ip[fn]s)\/(?<cidOrPeerIdOrDnsLink>[^/?]+)\/?(?<path>[^?]*)\??(?<query>.*)$/
const SUBDOMAIN_GATEWAY_REGEX = /^https?:\/\/(?<cidOrPeerIdOrDnsLink>[^/?]+)\.(?<protocol>ip[fn]s)\.([^/?]+)\/?(?<path>[^?]*)\??(?<query>.*)$/

interface MatchUrlGroups {
  protocol: 'ipfs' | 'ipns'
  cidOrPeerIdOrDnsLink: string
  path?: string
  query?: string
}

function matchUrlGroupsGuard (groups?: null | { [key in string]: string; } | MatchUrlGroups): groups is MatchUrlGroups {
  const protocol = groups?.protocol
  if (protocol == null) { return false }
  const cidOrPeerIdOrDnsLink = groups?.cidOrPeerIdOrDnsLink
  if (cidOrPeerIdOrDnsLink == null) { return false }
  const path = groups?.path
  const query = groups?.query

  return ['ipns', 'ipfs'].includes(protocol) &&
    typeof cidOrPeerIdOrDnsLink === 'string' &&
    (path == null || typeof path === 'string') &&
    (query == null || typeof query === 'string')
}

// TODO: can this be replaced with `new URL`?
export function matchURLString (urlString: string): MatchUrlGroups {
  /**
   * Remove hash fragment from URL before processing.
   * Hash fragments are client-side only and should not be included in URL parsing.
   * They cause issues with:
   * 1. Regex URL parsing (hash gets captured as part of query string)
   * 2. IPFS path resolution (hash is not part of the content path)
   *
   * @see https://github.com/ipfs/service-worker-gateway/issues/859
   */
  
  const hashIndex = urlString.indexOf('#')
  if (hashIndex !== -1) {
    urlString = urlString.substring(0, hashIndex)
  }

  for (const pattern of [SUBDOMAIN_GATEWAY_REGEX, URL_REGEX, PATH_GATEWAY_REGEX, PATH_REGEX]) {
    const match = urlString.match(pattern)

    if (matchUrlGroupsGuard(match?.groups)) {
      const groups = match.groups satisfies MatchUrlGroups

      if (groups.path != null) {
        groups.path = decodeURIComponent(groups.path)
      }

      // decode inline dnslink domain if present
      if (pattern === SUBDOMAIN_GATEWAY_REGEX && groups.protocol === 'ipns' && isInlinedDnsLink(groups.cidOrPeerIdOrDnsLink)) {
        groups.cidOrPeerIdOrDnsLink = dnsLinkLabelDecoder(groups.cidOrPeerIdOrDnsLink)
      }

      return groups
    }
  }

  throw new TypeError(`Invalid URL: ${urlString}, please use ipfs://, ipns://, or gateway URLs only`)
}

/**
 * For DNSLink see https://specs.ipfs.tech/http-gateways/subdomain-gateway/#host-request-header
 * DNSLink names include . which means they must be inlined into a single DNS label to provide unique origin and work with wildcard TLS certificates.
 */

// DNS label can have up to 63 characters, consisting of alphanumeric
// characters or hyphens -, but it must not start or end with a hyphen.
const dnsLabelRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/

/**
 * Checks if label looks like inlined DNSLink.
 * (https://specs.ipfs.tech/http-gateways/subdomain-gateway/#host-request-header)
 */
function isInlinedDnsLink (label: string): boolean {
  return dnsLabelRegex.test(label) && label.includes('-') && !label.includes('.')
}

/**
 * DNSLink label decoding
 * - Every standalone - is replaced with .
 * - Every remaining -- is replaced with -
 *
 * @example en-wikipedia--on--ipfs-org.ipns.example.net -> example.net/ipns/en.wikipedia-on-ipfs.org
 */
function dnsLinkLabelDecoder (linkLabel: string): string {
  return linkLabel.replace(/--/g, '%').replace(/-/g, '.').replace(/%/g, '-')
}
