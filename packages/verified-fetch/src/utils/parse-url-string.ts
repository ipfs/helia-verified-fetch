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
  for (const pattern of [SUBDOMAIN_GATEWAY_REGEX, URL_REGEX, PATH_GATEWAY_REGEX, PATH_REGEX]) {
    const match = urlString.match(pattern)

    if (matchUrlGroupsGuard(match?.groups)) {
      const groups = match.groups satisfies MatchUrlGroups

      if (groups.path != null) {
        groups.path = decodeURIComponent(groups.path)
      }

      return groups
    }
  }

  throw new TypeError(`Invalid URL: ${urlString}, please use ipfs://, ipns://, or gateway URLs only`)
}
