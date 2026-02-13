import { DoesNotExistError } from '@helia/unixfs/errors'
import { peerIdFromString } from '@libp2p/peer-id'
import { exporter, InvalidParametersError, walkPath } from 'ipfs-unixfs-exporter'
import toBuffer from 'it-to-buffer'
import { CID } from 'multiformats/cid'
import QuickLRU from 'quick-lru'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { SESSION_CACHE_MAX_SIZE, SESSION_CACHE_TTL_MS } from './constants.ts'
import { applyRedirects } from './utils/apply-redirect.ts'
import { ServerTiming } from './utils/server-timing.ts'
import type { ResolveURLOptions, ResolveURLResult, URLResolver as URLResolverInterface } from './index.ts'
import type { DNSLink } from '@helia/dnslink'
import type { IPNSResolver } from '@helia/ipns'
import type { AbortOptions, Logger } from '@libp2p/interface'
import type { Helia, ProviderOptions, SessionBlockstore } from 'helia'
import type { Blockstore } from 'interface-blockstore'
import type { PathEntry, UnixFSEntry } from 'ipfs-unixfs-exporter'

// 1 year in seconds for ipfs content
const IPFS_CONTENT_TTL = 29030400

interface GetBlockstoreOptions extends AbortOptions, ProviderOptions {
  session?: boolean
}

export interface WalkPathResult {
  ipfsRoots: CID[]
  terminalElement: PathEntry
  blockstore: Blockstore
  redirected: boolean
}

function basicEntry (cid: CID): PathEntry {
  return {
    cid,
    name: cid.toString(),
    path: cid.toString(),
    roots: [
      cid
    ],
    remainder: []
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

export class URLResolver implements URLResolverInterface {
  private log: Logger
  private readonly components: URLResolverComponents
  private readonly blockstoreSessions: QuickLRU<string, SessionBlockstore>

  constructor (components: URLResolverComponents, init: URLResolverInit = {}) {
    this.components = components

    this.log = components.helia.logger.forComponent('helia-verified-fetch:url-resolver')
    this.blockstoreSessions = new QuickLRU({
      maxSize: init.sessionCacheSize ?? SESSION_CACHE_MAX_SIZE,
      maxAge: init.sessionTTLms ?? SESSION_CACHE_TTL_MS,
      onEviction: (key, store) => {
        store.close()
      }
    })
  }

  async resolve (url: URL, serverTiming: ServerTiming = new ServerTiming(), options: ResolveURLOptions = {}): Promise<ResolveURLResult | Response> {
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

  private async getBlockstore (root: CID, options: GetBlockstoreOptions = {}): Promise<Blockstore> {
    if (options.session === false) {
      return this.components.helia.blockstore
    }

    const key = `ipfs:${root}`
    let session = this.blockstoreSessions.get(key)
    let createdSession = false

    if (session == null) {
      this.log('create session with %d initial providers for root %c', options.providers?.length ?? 0, root)
      createdSession = true
      session = this.components.helia.blockstore.createSession(root, options)
      this.blockstoreSessions.set(key, session)
    }

    if (!createdSession && options.providers != null && options.providers.length > 0) {
      this.log('adding %d providers to existing session for root %c', options.providers.length, root)

      try {
        const res = await Promise.all(
          options.providers.map(async peer => {
            await session.addPeer(peer, options)
          }) ?? []
        )

        this.log('result was %o', res)
      } catch (err) {
        this.log.error('could not add provs - %e', err)
      }
    }

    return session
  }

  private async resolveDNSLink (url: URL, serverTiming: ServerTiming, options?: ResolveURLOptions): Promise<ResolveURLResult | Response> {
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

    if (result.path != null && (url.pathname !== '' && url.pathname !== '/')) {
      // path conflict?
    }

    const ipfsUrl = new URL(`ipfs://${result.cid}/${url.pathname}`)
    const ipfsResult = await this.resolveIPFSPath(ipfsUrl, serverTiming, options)

    if (ipfsResult instanceof Response) {
      return ipfsResult
    }

    return {
      ...ipfsResult,
      url,
      ttl: result.answer.TTL
    }
  }

  private async resolveIPNSName (url: URL, serverTiming: ServerTiming, options?: ResolveURLOptions): Promise<ResolveURLResult | Response> {
    const peerId = peerIdFromString(url.hostname)
    const result = await serverTiming.time('ipns.resolve', `Resolve IPNS name ${peerId}`, this.components.ipnsResolver.resolve(peerId, options))

    if (result.path != null && (url.pathname !== '' && url.pathname !== '/')) {
      // path conflict?
    }

    const ipfsUrl = new URL(`ipfs://${result.cid}/${url.pathname}`)
    const ipfsResult = await this.resolveIPFSPath(ipfsUrl, serverTiming, options)

    if (ipfsResult instanceof Response) {
      return ipfsResult
    }

    return {
      ...ipfsResult,
      url,
      // IPNS ttl is in nanoseconds, convert to seconds
      ttl: Number((result.record.ttl ?? 0n) / BigInt(1e9))
    }
  }

  private async resolveIPFSPath (url: URL, serverTiming: ServerTiming, options?: ResolveURLOptions): Promise<ResolveURLResult | Response> {
    const walkPathResult = await serverTiming.time('ipfs.resolve', '', this.walkPath(url, options))

    if (walkPathResult instanceof Response) {
      return walkPathResult
    }

    return {
      ...walkPathResult,
      url,
      ttl: IPFS_CONTENT_TTL,
      blockstore: walkPathResult.blockstore
    }
  }

  private async walkPath (url: URL, options: ResolveURLOptions = {}): Promise<WalkPathResult | Response> {
    let cid: CID

    try {
      cid = CID.parse(url.hostname)
    } catch (err) {
      throw new InvalidParametersError(`Could not parse CID - ${err}`)
    }

    const blockstore = await this.getBlockstore(cid, options)

    try {
      const ipfsRoots: CID[] = []
      let terminalElement: PathEntry | undefined
      const ipfsPath = toIPFSPath(url)

      for await (const entry of walkPath(ipfsPath, blockstore, {
        ...options,
        yieldSubShards: true
      })) {
        ipfsRoots.push(entry.cid)
        terminalElement = entry
      }

      if (terminalElement == null) {
        throw new DoesNotExistError('No terminal element found')
      }

      return {
        ipfsRoots,
        terminalElement,
        blockstore,
        redirected: options.redirected === true
      }
    } catch (err: any) {
      if (err.name === 'NotFoundError' && options.redirected !== true) {
        // if the path did not exist, check for the existence of a _redirects
        // file and apply if any of the contained rules are applicable
        // @see https://specs.ipfs.tech/http-gateways/web-redirects-file/#no-forced-redirects

        let redirectsEntry: UnixFSEntry | undefined

        try {
          redirectsEntry = await exporter(`${cid}/_redirects`, blockstore, options)
        } catch (err: any) {
          // ignore missing _redirects file
          if (err.name !== 'NotFoundError') {
            throw err
          }
        }

        if (redirectsEntry?.type === 'file' || redirectsEntry?.type === 'raw') {
          const redirects = uint8ArrayToString(await toBuffer(redirectsEntry.content(options)))
          const redirectResponse = applyRedirects(url, redirects, options)

          if (redirectResponse instanceof Response) {
            return redirectResponse
          } else if (redirectResponse instanceof URL) {
            // follow redirect
            return this.walkPath(redirectResponse, {
              ...options,
              redirected: true
            })
          }
        }
      }

      if (err.name === 'NoResolverError') {
        // may be an unknown codec
        return {
          ipfsRoots: [cid],
          terminalElement: basicEntry(cid),
          blockstore,
          redirected: false
        }
      }

      throw err
    }
  }
}

function toIPFSPath (url: URL): string {
  return `/ipfs/${url.hostname}${decodeURI(url.pathname)}`
}
