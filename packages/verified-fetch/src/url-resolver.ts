import { peerIdFromCID, peerIdFromString } from '@libp2p/peer-id'
import { CID } from 'multiformats/cid'
import { matchURLString } from './utils/parse-url-string.ts'
import type { ResolveURLOptions, ResolveURLResult, Resource, URLResolver as URLResolverInterface } from './index.ts'
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

function toQuery (query?: string): Record<string, any> {
  if (query == null) {
    return {}
  }

  const params = new URLSearchParams(query)
  const output: Record<string, any> = {}

  for (const [key, value] of params.entries()) {
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
      return this.resolveCIDResource(cid, '', {}, options)
    }

    throw new TypeError(`Invalid resource. Cannot determine CID from resource: ${resource}`)
  }

  async parseUrlString (urlString: string, options: ResolveURLOptions = {}): Promise<ResolveURLResult> {
    const { protocol, cidOrPeerIdOrDnsLink, path, query } = matchURLString(urlString)

    if (protocol === 'ipfs') {
      const cid = CID.parse(cidOrPeerIdOrDnsLink)

      return this.resolveCIDResource(cid, path ?? '', toQuery(query), options)
    }

    if (protocol === 'ipns') {
      // try to parse target as peer id
      let peerId: PeerId

      try {
        peerId = peerIdFromString(cidOrPeerIdOrDnsLink)
      } catch {
        // fall back to DNSLink (e.g. /ipns/example.com)
        return this.resolveDNSLink(cidOrPeerIdOrDnsLink, path ?? '', toQuery(query), options)
      }

      // parse multihash from string (e.g. /ipns/QmFoo...)
      return this.resolveIPNSName(cidOrPeerIdOrDnsLink, peerId, path ?? '', toQuery(query), options)
    }

    throw new TypeError(`Invalid resource. Cannot determine CID from resource: ${urlString}`)
  }

  async resolveCIDResource (cid: CID, path: string, query: Record<string, any>, options: ResolveURLOptions = {}): Promise<ResolveURLResult> {
    if (cid.code === CODEC_LIBP2P_KEY) {
      // special case - peer id encoded as a CID
      return this.resolveIPNSName(cid.toString(), peerIdFromCID(cid), path, query, options)
    }

    return {
      cid,
      protocol: 'ipfs',
      query,
      path,
      ttl: 29030400, // 1 year for ipfs content
      ipfsPath: `/ipfs/${cid}${path === '' ? '' : `/${path}`}`
    }
  }

  async resolveDNSLink (domain: string, path: string, query: Record<string, any>, options?: ResolveURLOptions): Promise<ResolveURLResult> {
    const results = await this.components.timing.time('dnsLink.resolve', `Resolve DNSLink ${domain}`, this.components.dnsLink.resolve(domain, options))
    const result = results?.[0]

    if (result == null) {
      throw new TypeError(`Invalid resource. Cannot resolve DNSLink from domain: ${domain}`)
    }

    // dnslink resolved to IPNS name
    if (result.namespace === 'ipns') {
      return this.resolveIPNSName(domain, result.peerId, path, query, options)
    }

    // dnslink resolved to CID
    if (result.namespace !== 'ipfs') {
      // @ts-expect-error result namespace should only be ipns or ipfs
      throw new TypeError(`Invalid resource. Unexpected DNSLink namespace ${result.namespace} from domain: ${domain}`)
    }

    return {
      cid: result.cid,
      path: concatPaths(result.path, path),
      // dnslink is mutable so return 'ipns' protocol so we do not include immutable in cache-control header
      protocol: 'ipns',
      ttl: result.answer.TTL,
      query,
      ipfsPath: `/ipns/${domain}${path === '' ? '' : `/${path}`}`
    }
  }

  async resolveIPNSName (resource: string, key: PeerId, path: string, query: Record<string, any>, options?: AbortOptions): Promise<ResolveURLResult> {
    const result = await this.components.timing.time('ipns.resolve', `Resolve IPNS name ${key}`, this.components.ipnsResolver.resolve(key, options))

    return {
      cid: result.cid,
      path: concatPaths(result.path, path),
      query,
      protocol: 'ipns',
      // IPNS ttl is in nanoseconds, convert to seconds
      ttl: Number((result.record.ttl ?? 0n) / BigInt(1e9)),
      ipfsPath: `/ipns/${resource}${path === '' ? '' : `/${path}`}`
    }
  }
}

function concatPaths (...paths: Array<string | undefined>): string {
  return `${
    paths
      .filter(p => p != null && p !== '')
      .join('/')
      .replaceAll(/(\/+)/g, '/')
      .replace(/^(\/)+/, '')
      .replace(/(\/)+$/, '/')
  }`
}
