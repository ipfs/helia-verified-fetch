import { peerIdFromString } from '@libp2p/peer-id'
import { CID } from 'multiformats/cid'
import { TLRU } from './tlru.js'
import type { RequestFormatShorthand } from '../types.js'
import type { DNSLinkResolveResult, IPNS, IPNSResolveResult, ResolveDNSLinkProgressEvents, ResolveResult } from '@helia/ipns'
import type { ComponentLogger } from '@libp2p/interface'
import type { ProgressOptions } from 'progress-events'

const ipnsCache = new TLRU<DNSLinkResolveResult | IPNSResolveResult>(1000)

export interface ParseUrlStringInput {
  urlString: string
  ipns: IPNS
  logger: ComponentLogger
}
export interface ParseUrlStringOptions extends ProgressOptions<ResolveDNSLinkProgressEvents> {

}

export interface ParsedUrlQuery extends Record<string, string | unknown> {
  format?: RequestFormatShorthand
  download?: boolean
  filename?: string
}

interface ParsedUrlStringResultsBase extends ResolveResult {
  protocol: 'ipfs' | 'ipns'
  query: ParsedUrlQuery
  ttl: number
}

export type ParsedUrlStringResults = ParsedUrlStringResultsBase // | DNSLinkResolveResult | IPNSResolveResult

const URL_REGEX = /^(?<protocol>ip[fn]s):\/\/(?<cidOrPeerIdOrDnsLink>[^/?]+)\/?(?<path>[^?]*)\??(?<queryString>.*)$/
const PATH_REGEX = /^\/(?<protocol>ip[fn]s)\/(?<cidOrPeerIdOrDnsLink>[^/?]+)\/?(?<path>[^?]*)\??(?<queryString>.*)$/
const PATH_GATEWAY_REGEX = /^https?:\/\/(.*[^/])\/(?<protocol>ip[fn]s)\/(?<cidOrPeerIdOrDnsLink>[^/?]+)\/?(?<path>[^?]*)\??(?<queryString>.*)$/
const SUBDOMAIN_GATEWAY_REGEX = /^https?:\/\/(?<cidOrPeerIdOrDnsLink>[^/?]+)\.(?<protocol>ip[fn]s)\.([^/?]+)\/?(?<path>[^?]*)\??(?<queryString>.*)$/

interface MatchUrlGroups {
  protocol: 'ipfs' | 'ipns'
  cidOrPeerIdOrDnsLink: string
  path?: string
  queryString?: string

}
function matchURLString (urlString: string): MatchUrlGroups {
  for (const pattern of [URL_REGEX, PATH_REGEX, PATH_GATEWAY_REGEX, SUBDOMAIN_GATEWAY_REGEX]) {
    const match = urlString.match(pattern)

    if (match?.groups != null) {
      return match.groups as unknown as MatchUrlGroups // force cast to MatchUrlGroups, because if it matches, it has to contain this structure.
    }
  }

  throw new TypeError(`Invalid URL: ${urlString}, please use ipfs://, ipns://, or gateway URLs only`)
}

/**
 * For dnslinks see https://specs.ipfs.tech/http-gateways/subdomain-gateway/#host-request-header
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
 * * Every standalone - is replaced with .
 * * Every remaining -- is replaced with -
 *
 * @example en-wikipedia--on--ipfs-org.ipns.example.net -> example.net/ipns/en.wikipedia-on-ipfs.org
 */
function dnsLinkLabelDecoder (linkLabel: string): string {
  return linkLabel.replace(/--/g, '%').replace(/-/g, '.').replace(/%/g, '-')
}

/**
 * A function that parses ipfs:// and ipns:// URLs, returning an object with easily recognizable properties.
 *
 * After determining the protocol successfully, we process the cidOrPeerIdOrDnsLink:
 * * If it's ipfs, it parses the CID or throws an Aggregate error
 * * If it's ipns, it attempts to resolve the PeerId and then the DNSLink. If both fail, an Aggregate error is thrown.
 */
export async function parseUrlString ({ urlString, ipns, logger }: ParseUrlStringInput, options?: ParseUrlStringOptions): Promise<ParsedUrlStringResults> {
  const log = logger.forComponent('helia:verified-fetch:parse-url-string')
  const { protocol, cidOrPeerIdOrDnsLink, path: urlPath, queryString } = matchURLString(urlString)

  let cid: CID | undefined
  let resolvedPath: string | undefined
  const errors: Error[] = []
  let resolveResult: IPNSResolveResult | DNSLinkResolveResult | undefined
  let ttl: number = 5 * 60 // 5 minutes based on https://github.com/ipfs/boxo/issues/329#issuecomment-1995236409

  if (protocol === 'ipfs') {
    try {
      cid = CID.parse(cidOrPeerIdOrDnsLink)
      ttl = 29030400 // 1 year for ipfs content
    } catch (err) {
      log.error(err)
      errors.push(new TypeError('Invalid CID for ipfs://<cid> URL'))
    }
  } else {
    // protocol is ipns
    resolveResult = ipnsCache.get(cidOrPeerIdOrDnsLink)

    if (resolveResult != null) {
      cid = resolveResult.cid
      resolvedPath = resolveResult.path
      const answerTtl = (resolveResult as DNSLinkResolveResult).answer?.TTL
      const recordTtl = (resolveResult as IPNSResolveResult).record?.ttl
      ttl = Number(answerTtl ?? recordTtl ?? ttl)
      log.trace('resolved %s to %c from cache', cidOrPeerIdOrDnsLink, cid)
    } else {
      log.trace('Attempting to resolve PeerId for %s', cidOrPeerIdOrDnsLink)
      let peerId = null
      try {
        peerId = peerIdFromString(cidOrPeerIdOrDnsLink)
        resolveResult = await ipns.resolve(peerId, { onProgress: options?.onProgress })
        cid = resolveResult?.cid
        resolvedPath = resolveResult?.path
        /**
         * For TTL nuances, see
         *
         * @see https://github.com/ipfs/js-ipns/blob/16e0e10682fa9a663e0bb493a44d3e99a5200944/src/index.ts#L200
         * @see https://github.com/ipfs/js-ipns/pull/308
         */
        ttl = Number(resolveResult.record.ttl)
        log.trace('resolved %s to %c', cidOrPeerIdOrDnsLink, cid)
        ipnsCache.set(cidOrPeerIdOrDnsLink, resolveResult, 60 * 1000 * 2)
      } catch (err) {
        if (peerId == null) {
          log.error('Could not parse PeerId string "%s"', cidOrPeerIdOrDnsLink, err)
          errors.push(new TypeError(`Could not parse PeerId in ipns url "${cidOrPeerIdOrDnsLink}", ${(err as Error).message}`))
        } else {
          log.error('Could not resolve PeerId %c', peerId, err)
          errors.push(new TypeError(`Could not resolve PeerId "${cidOrPeerIdOrDnsLink}", ${(err as Error).message}`))
        }
      }

      if (cid == null) {
        let decodedDnsLinkLabel = cidOrPeerIdOrDnsLink
        if (isInlinedDnsLink(cidOrPeerIdOrDnsLink)) {
          decodedDnsLinkLabel = dnsLinkLabelDecoder(cidOrPeerIdOrDnsLink)
          log.trace('decoded dnslink from "%s" to "%s"', cidOrPeerIdOrDnsLink, decodedDnsLinkLabel)
        }
        log.trace('Attempting to resolve DNSLink for %s', decodedDnsLinkLabel)

        try {
          resolveResult = await ipns.resolveDNSLink(decodedDnsLinkLabel, { onProgress: options?.onProgress })
          cid = resolveResult?.cid
          resolvedPath = resolveResult?.path
          ttl = resolveResult.answer.TTL
          log.trace('resolved %s to %c', decodedDnsLinkLabel, cid)
          ipnsCache.set(cidOrPeerIdOrDnsLink, resolveResult, 60 * 1000 * 2)
        } catch (err: any) {
          log.error('Could not resolve DnsLink for "%s"', cidOrPeerIdOrDnsLink, err)
          errors.push(err)
        }
      }
    }
  }

  if (cid == null) {
    if (errors.length === 1) {
      throw errors[0]
    }

    throw new AggregateError(errors, `Invalid resource. Cannot determine CID from URL "${urlString}"`)
  }

  // parse query string
  const query: Record<string, any> = {}

  if (queryString != null && queryString.length > 0) {
    const queryParts = queryString.split('&')
    for (const part of queryParts) {
      const [key, value] = part.split('=')
      query[key] = decodeURIComponent(value)
    }

    if (query.download != null) {
      query.download = query.download === 'true'
    }

    if (query.filename != null) {
      query.filename = query.filename.toString()
    }
  }

  return {
    protocol,
    cid,
    path: joinPaths(resolvedPath, urlPath ?? ''),
    query,
    ttl
  } satisfies ParsedUrlStringResults
}

/**
 * join the path from resolve result & given path.
 * e.g. /ipns/<peerId>/ that is resolved to /ipfs/<cid>/<path1>, when requested as /ipns/<peerId>/<path2>, should be
 * resolved to /ipfs/<cid>/<path1>/<path2>
 */
function joinPaths (resolvedPath: string | undefined, urlPath: string): string {
  let path = ''

  if (resolvedPath != null) {
    path += resolvedPath
  }

  if (urlPath.length > 0) {
    path = `${path.length > 0 ? `${path}/` : path}${urlPath}`
  }

  // replace duplicate forward slashes
  path = path.replace(/\/(\/)+/g, '/')

  // strip trailing forward slash if present
  if (path.startsWith('/')) {
    path = path.substring(1)
  }

  return path
}
