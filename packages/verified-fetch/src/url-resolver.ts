import { DoesNotExistError } from '@helia/unixfs/errors'
import * as dagCbor from '@ipld/dag-cbor'
import * as dagJson from '@ipld/dag-json'
import * as dagPb from '@ipld/dag-pb'
import { peerIdFromString } from '@libp2p/peer-id'
import { InvalidParametersError, walkPath } from 'ipfs-unixfs-exporter'
import toBuffer from 'it-to-buffer'
import { CID } from 'multiformats/cid'
import * as json from 'multiformats/codecs/json'
import * as raw from 'multiformats/codecs/raw'
import QuickLRU from 'quick-lru'
import { SESSION_CACHE_MAX_SIZE, SESSION_CACHE_TTL_MS, CODEC_CBOR, CODEC_IDENTITY } from './constants.ts'
import { resourceToSessionCacheKey } from './utils/resource-to-cache-key.ts'
import { ServerTiming } from './utils/server-timing.ts'
import type { ResolveURLResult, URLResolver as URLResolverInterface } from './index.ts'
import type { DNSLink } from '@helia/dnslink'
import type { IPNSResolver } from '@helia/ipns'
import type { AbortOptions } from '@libp2p/interface'
import type { Helia, SessionBlockstore } from 'helia'
import type { Blockstore } from 'interface-blockstore'
import type { UnixFSEntry } from 'ipfs-unixfs-exporter'

// 1 year in seconds for ipfs content
const IPFS_CONTENT_TTL = 29030400

const ENTITY_CODECS = [
  CODEC_CBOR,
  json.code,
  raw.code
]

/**
 * These are supported by the UnixFS exporter
 */
const EXPORTABLE_CODECS = [
  dagPb.code,
  dagCbor.code,
  dagJson.code,
  raw.code
]

interface GetBlockstoreOptions extends AbortOptions {
  session?: boolean
}

export interface WalkPathResult {
  ipfsRoots: CID[]
  terminalElement: UnixFSEntry
  blockstore: Blockstore
}

function basicEntry (type: 'raw' | 'object', cid: CID, bytes: Uint8Array): UnixFSEntry {
  return {
    name: cid.toString(),
    path: cid.toString(),
    depth: 0,
    type,
    node: bytes,
    cid,
    size: BigInt(bytes.byteLength),
    content: async function * () {
      yield bytes
    }
  }
}

export interface URLResolverComponents {
  helia: Helia
  ipnsResolver: IPNSResolver
  dnsLink: DNSLink
}

export interface URLResolverInit {
  sessionCacheSize?: number
  sessionTTLms?: number
}

export interface ResolveURLOptions extends AbortOptions {
  session?: boolean
}

export class URLResolver implements URLResolverInterface {
  private readonly components: URLResolverComponents
  private readonly blockstoreSessions: QuickLRU<string, SessionBlockstore>

  constructor (components: URLResolverComponents, init: URLResolverInit = {}) {
    this.components = components

    this.blockstoreSessions = new QuickLRU({
      maxSize: init.sessionCacheSize ?? SESSION_CACHE_MAX_SIZE,
      maxAge: init.sessionTTLms ?? SESSION_CACHE_TTL_MS,
      onEviction: (key, store) => {
        store.close()
      }
    })
  }

  async resolve (url: URL, serverTiming: ServerTiming = new ServerTiming(), options: ResolveURLOptions = {}): Promise<ResolveURLResult> {
    if (url.protocol === 'ipfs:') {
      return this.resolveIPFSPath(url, serverTiming, options)
    }

    if (url.protocol === 'ipns:') {
      return this.resolveIPNSName(url, serverTiming, options)
    }

    if (url.protocol === 'dnslink:') {
      return this.resolveDNSLink(url, serverTiming, options)
    }

    throw new InvalidParametersError(`Invalid resource. Unsupported protocol in URL, must be ipfs:, ipns:, or dnslink: ${url}`)
  }

  private getBlockstore (root: CID, options: GetBlockstoreOptions = {}): Blockstore {
    if (options.session === false) {
      return this.components.helia.blockstore
    }

    const key = resourceToSessionCacheKey(root)
    let session = this.blockstoreSessions.get(key)

    if (session == null) {
      session = this.components.helia.blockstore.createSession(root, options)
      this.blockstoreSessions.set(key, session)
    }

    return session
  }

  private async resolveDNSLink (url: URL, serverTiming: ServerTiming, options?: ResolveURLOptions): Promise<ResolveURLResult> {
    const results = await serverTiming.time('dnsLink.resolve', `Resolve DNSLink ${url.hostname}`, this.components.dnsLink.resolve(url.hostname, options))
    const result = results?.[0]

    if (result == null) {
      throw new TypeError(`Invalid resource. Cannot resolve DNSLink from domain: ${url.hostname}`)
    }

    // dnslink resolved to IPNS name
    if (result.namespace === 'ipns') {
      return this.resolveIPNSName(url, serverTiming, options)
    }

    // dnslink resolved to CID
    if (result.namespace !== 'ipfs') {
      // @ts-expect-error result namespace should only be ipns or ipfs
      throw new TypeError(`Invalid resource. Unexpected DNSLink namespace ${result.namespace} from domain: ${domain}`)
    }

    if (result.path != null && url.pathname !== '') {
      // path conflict?
    }

    const ipfsUrl = new URL(`ipfs://${result.cid}/${url.pathname}`)
    const ipfsResult = await this.resolveIPFSPath(ipfsUrl, serverTiming, options)

    return {
      ...ipfsResult,
      url,
      ttl: result.answer.TTL
    }
  }

  private async resolveIPNSName (url: URL, serverTiming: ServerTiming, options?: ResolveURLOptions): Promise<ResolveURLResult> {
    const peerId = peerIdFromString(url.hostname)
    const result = await serverTiming.time('ipns.resolve', `Resolve IPNS name ${peerId}`, this.components.ipnsResolver.resolve(peerId, options))

    if (result.path != null && url.pathname !== '') {
      // path conflict?
    }

    const ipfsUrl = new URL(`ipfs://${result.cid}/${url.pathname}`)
    const ipfsResult = await this.resolveIPFSPath(ipfsUrl, serverTiming, options)

    return {
      ...ipfsResult,
      url,
      // IPNS ttl is in nanoseconds, convert to seconds
      ttl: Number((result.record.ttl ?? 0n) / BigInt(1e9))
    }
  }

  private async resolveIPFSPath (url: URL, serverTiming: ServerTiming, options?: ResolveURLOptions): Promise<ResolveURLResult> {
    const walkPathResult = await serverTiming.time('ipfs.resolve', '', this.walkPath(url, options))

    return {
      ...walkPathResult,
      url,
      ttl: IPFS_CONTENT_TTL,
      blockstore: walkPathResult.blockstore
    }
  }

  private async walkPath (url: URL, options: ResolveURLOptions = {}): Promise<WalkPathResult> {
    const cid = CID.parse(url.hostname)
    const blockstore = this.getBlockstore(cid, options)

    if (EXPORTABLE_CODECS.includes(cid.code)) {
      const ipfsRoots: CID[] = []
      let terminalElement: UnixFSEntry | undefined
      const ipfsPath = toIPFSPath(url)

      for await (const entry of walkPath(ipfsPath, blockstore, options)) {
        ipfsRoots.push(entry.cid)
        terminalElement = entry
      }

      if (terminalElement == null) {
        throw new DoesNotExistError('No terminal element found')
      }

      return {
        ipfsRoots,
        terminalElement,
        blockstore
      }
    }

    let bytes: Uint8Array

    if (cid.multihash.code === CODEC_IDENTITY) {
      bytes = cid.multihash.digest
    } else {
      bytes = await toBuffer(blockstore.get(cid, options))
    }

    // entity codecs contain all the bytes for an entity in one block and no
    // path walking outside of that block is possible
    if (ENTITY_CODECS.includes(cid.code)) {
      return {
        ipfsRoots: [cid],
        terminalElement: basicEntry('object', cid, bytes),
        blockstore
      }
    }

    // may be an unknown codec
    return {
      ipfsRoots: [cid],
      terminalElement: basicEntry('raw', cid, bytes),
      blockstore
    }
  }
}

function toIPFSPath (url: URL): string {
  return `/ipfs/${url.hostname}${
    url.pathname.split('/')
      .map(part => decodeURIComponent(part))
      .join('/')
  }`
}
