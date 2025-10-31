import { peerIdFromCID, peerIdFromString } from '@libp2p/peer-id'
import { CID } from 'multiformats/cid'
import { parseURLString } from './utils/parse-url-string.ts'
import type { ResolveURLOptions, ResolveURLResult, Resource, URLResolver as URLResolverInterface } from './index.ts'
import type { ParsedURL } from './utils/parse-url-string.ts'
import type { ServerTiming } from './utils/server-timing.ts'
import type { DNSLink } from '@helia/dnslink'
import type { IPNSResolver } from '@helia/ipns'
import type { AbortOptions, PeerId } from '@libp2p/interface'

const CODEC_LIBP2P_KEY = 0x72

export interface URLResolverComponents {
  ipnsResolver: IPNSResolver
  dnsLink: DNSLink
  timing: ServerTiming
}

export class URLResolver implements URLResolverInterface {
  private readonly components: URLResolverComponents

  constructor (components: URLResolverComponents) {
    this.components = components
  }

  async resolve (resource: Resource, options: ResolveURLOptions = {}): Promise<ResolveURLResult> {
    if (typeof resource === 'string') {
      return this.parseUrlString(resource, options)
    }

    const cid = CID.asCID(resource)

    if (cid != null) {
      return this.resolveCIDResource(cid, {
        url: new URL(`ipfs://${cid}`)
      }, options)
    }

    throw new TypeError(`Invalid resource. Cannot determine CID from resource: ${resource}`)
  }

  async parseUrlString (urlString: string, options: ResolveURLOptions = {}): Promise<ResolveURLResult> {
    const result = parseURLString(urlString)

    if (result.protocol === 'ipfs') {
      const cid = CID.parse(result.cidOrPeerIdOrDnsLink)

      return this.resolveCIDResource(cid, result, options)
    }

    if (result.protocol === 'ipns') {
      // try to parse target as peer id
      let peerId: PeerId

      try {
        peerId = peerIdFromString(result.cidOrPeerIdOrDnsLink)
      } catch {
        // fall back to DNSLink (e.g. /ipns/example.com)
        return this.resolveDNSLink(result.cidOrPeerIdOrDnsLink, result, options)
      }

      // parse multihash from string (e.g. /ipns/QmFoo...)
      return this.resolveIPNSName(result.cidOrPeerIdOrDnsLink, peerId, result, options)
    }

    throw new TypeError(`Invalid resource. Cannot determine CID from resource: ${urlString}`)
  }

  async resolveCIDResource (cid: CID, parsed: Partial<ParsedURL> & Pick<ParsedURL, 'url'>, options: ResolveURLOptions = {}): Promise<ResolveURLResult> {
    if (cid.code === CODEC_LIBP2P_KEY) {
      // special case - peer id encoded as a CID
      return this.resolveIPNSName(cid.toString(), peerIdFromCID(cid), parsed, options)
    }

    return {
      url: parsed.url,
      cid,
      protocol: 'ipfs',
      query: parsed.query ?? {},
      path: parsed.path ?? [],
      fragment: parsed.fragment ?? '',
      ttl: 29030400, // 1 year for ipfs content
      ipfsPath: `/ipfs/${cid}${parsed.url.pathname}`
    }
  }

  async resolveDNSLink (domain: string, parsed: ParsedURL, options?: ResolveURLOptions): Promise<ResolveURLResult> {
    const results = await this.components.timing.time('dnsLink.resolve', `Resolve DNSLink ${domain}`, this.components.dnsLink.resolve(domain, options))
    const result = results?.[0]

    if (result == null) {
      throw new TypeError(`Invalid resource. Cannot resolve DNSLink from domain: ${domain}`)
    }

    // dnslink resolved to IPNS name
    if (result.namespace === 'ipns') {
      return this.resolveIPNSName(domain, result.peerId, parsed, options)
    }

    // dnslink resolved to CID
    if (result.namespace !== 'ipfs') {
      // @ts-expect-error result namespace should only be ipns or ipfs
      throw new TypeError(`Invalid resource. Unexpected DNSLink namespace ${result.namespace} from domain: ${domain}`)
    }

    return {
      url: parsed.url,
      cid: result.cid,
      path: concatPaths(...(result.path ?? '').split('/'), ...(parsed.path ?? [])),
      fragment: parsed.fragment,
      // dnslink is mutable so return 'ipns' protocol so we do not include immutable in cache-control header
      protocol: 'ipns',
      ttl: result.answer.TTL,
      query: parsed.query,
      ipfsPath: `/ipns/${domain}${parsed.url.pathname}`
    }
  }

  async resolveIPNSName (resource: string, key: PeerId, parsed: Partial<ParsedURL> & Pick<ParsedURL, 'url'>, options?: AbortOptions): Promise<ResolveURLResult> {
    const result = await this.components.timing.time('ipns.resolve', `Resolve IPNS name ${key}`, this.components.ipnsResolver.resolve(key, options))

    return {
      url: parsed.url,
      cid: result.cid,
      path: concatPaths(...(result.path ?? '').split('/'), ...(parsed.path ?? [])),
      query: parsed.query ?? {},
      fragment: parsed.fragment ?? '',
      protocol: 'ipns',
      // IPNS ttl is in nanoseconds, convert to seconds
      ttl: Number((result.record.ttl ?? 0n) / BigInt(1e9)),
      ipfsPath: `/ipns/${resource}${parsed.url.pathname}`
    }
  }
}

function concatPaths (...paths: Array<string | undefined>): string[] {
  // @ts-expect-error undefined is filtered out
  return paths
    .filter(p => p != null && p !== '')
}
