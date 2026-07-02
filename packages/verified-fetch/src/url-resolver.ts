import { DoesNotExistError } from '@helia/unixfs/errors'
import * as cborg from 'cborg'
import { exporter, InvalidParametersError, walkPath } from 'ipfs-unixfs-exporter'
import last from 'it-last'
import toBuffer from 'it-to-buffer'
import { base58btc } from 'multiformats/bases/base58'
import { CID } from 'multiformats/cid'
import * as Digest from 'multiformats/hashes/digest'
import QuickLRU from 'quick-lru'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { CODEC_LIBP2P_KEY, SESSION_CACHE_MAX_SIZE, SESSION_CACHE_TTL_MS } from './constants.ts'
import { abbreviate } from './utils/abbreviate.ts'
import { applyRedirects } from './utils/apply-redirect.ts'
import { splitIPNSName } from './utils/ipfs-path-to-cid.ts'
import { ServerTiming } from './utils/server-timing.ts'
import type { ResolveURLOptions, ResolveURLResult, URLResolver as URLResolverInterface } from './index.ts'
import type { DNSLink } from '@helia/dnslink'
import type { IPNSResolver } from '@helia/ipns'
import type { AbortOptions, Logger } from '@libp2p/interface'
import type { Helia, ProviderOptions, SessionBlockstore } from 'helia'
import type { Blockstore } from 'interface-blockstore'
import type { PathEntry, UnixFSEntry } from 'ipfs-unixfs-exporter'
import type { MultihashDigest } from 'multiformats/cid'
import type { ProgressOptions } from 'progress-events'

// 1 year in seconds for ipfs content
const IPFS_CONTENT_TTL = 29030400

interface GetBlockstoreOptions extends AbortOptions, ProviderOptions, ProgressOptions {
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
    const results = await serverTiming.time(abbreviate('dnsLink.resolve'), '', this.components.dnsLink.resolve(url.hostname, options))
    const result = results?.[0]

    if (result == null) {
      throw new TypeError(`Invalid resource. Cannot resolve DNSLink from domain: ${url.hostname}`)
    }

    let resolveResult: ResolveURLResult | Response
    const path = normalizePath(`${result.path}/${url.pathname}`)

    if (result.namespace === 'ipns') {
      // dnslink resolved to IPNS name
      const ipnsUrl = new URL(`ipns://${base58btc.baseEncode(result.value.bytes)}${path}`)
      resolveResult = await this.resolveIPNSName(ipnsUrl, serverTiming, options)
    } else if (result.namespace === 'ipfs') {
      // dnslink resolved to CID
      const ipfsUrl = new URL(`ipfs://${result.cid}${path}`)
      resolveResult = await this.resolveIPFSPath(ipfsUrl, serverTiming, options)
    } else {
      // @ts-expect-error @helia/dnslink follows recursive DNSLink records so
      // result namespace should only be ipns or ipfs
      throw new TypeError(`Invalid resource. Unexpected DNSLink namespace ${result.namespace} from domain: ${url.hostname}`)
    }

    if (resolveResult instanceof Response) {
      return resolveResult
    }

    return {
      ...resolveResult,
      url,
      ttl: result.answer.TTL
    }
  }

  private async resolveIPNSName (url: URL, serverTiming: ServerTiming, options?: ResolveURLOptions): Promise<ResolveURLResult | Response> {
    const multihash = parseMultihash(url.hostname)
    const result = await serverTiming.time(abbreviate('ipns.resolve'), '', last(this.components.ipnsResolver.resolve(multihash, options)))

    if (result == null) {
      throw new InvalidParametersError('Could not resolve IPNS name')
    }

    const {
      ns, name, path
    } = splitIPNSName(result.value)

    if (ns !== 'ipfs') {
      throw new InvalidParametersError('IPNS name resolved to non-IPFS path')
    }

    const ipfsUrl = new URL(`ipfs://${name}${normalizePath(`${path ?? ''}/${url.pathname}`)}`)
    const ipfsResult = await this.resolveIPFSPath(ipfsUrl, serverTiming, options)

    if (ipfsResult instanceof Response) {
      return ipfsResult
    }

    let expires: Date | undefined
    const data = cborg.decode(result.record.data ?? new Uint8Array(0))

    // 0 is EOL
    if (data.ValidityType === 0 && data.Validity instanceof Uint8Array) {
      expires = new Date(uint8ArrayToString(data.Validity))
    }

    return {
      ...ipfsResult,
      url,
      // IPNS ttl is in nanoseconds, convert to seconds and round to the nearest
      // integer
      ttl: Math.round(Number((result.record.ttl ?? 0n) / BigInt(1e9))),
      expires
    }
  }

  private async resolveIPFSPath (url: URL, serverTiming: ServerTiming, options?: ResolveURLOptions): Promise<ResolveURLResult | Response> {
    const walkPathResult = await serverTiming.time(abbreviate('ipfs.resolve'), '', this.walkPath(url, options))

    if (walkPathResult instanceof Response) {
      return walkPathResult
    }

    if (walkPathResult.terminalElement.cid.code === CODEC_LIBP2P_KEY) {
      // special case, peer id encoded as libp2p key CID - interpret as IPNS
      const ipnsUrl = new URL(`ipns://${base58btc.baseEncode(walkPathResult.terminalElement.cid.multihash.bytes)}`)
      const ipnsResult = await this.resolveIPNSName(ipnsUrl, serverTiming, options)

      if (ipnsResult instanceof Response) {
        return ipnsResult
      }

      return {
        ...ipnsResult,
        url
      }
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
  let pathname = url.pathname.split('/')
    .map(component => decodeURIComponent(component))
    .join('/')
    .trim()

  if (pathname.length > 0 && !pathname.startsWith('/')) {
    pathname = `/${pathname}`
  }

  if (url.protocol === 'ipns:' && pathname === '/') {
    pathname = ''
  }

  return `/${url.protocol === 'ipfs:' ? 'ipfs' : 'ipns'}/${url.hostname}${pathname}`
}

/**
 * E.g.
 *
 * `''` -> `''`
 * `'/'` -> `''`
 * `'///'` -> `''`
 * `'/foo/bar/'` -> `'/foo/bar'`
 * `'foo/bar'` -> `'/foo/bar'`
 * etc
 */
function normalizePath (path: string): string {
  path = path.split('/')
    .map(s => s.trim())
    .filter(Boolean)
    .join('/')

  if (path !== '') {
    return `/${path}`
  }

  return ''
}

function parseMultihash (str: string): MultihashDigest {
  if (str.startsWith('1') || str.startsWith('Q')) {
    return Digest.decode(base58btc.baseDecode(str))
  }

  return CID.parse(str).multihash
}
