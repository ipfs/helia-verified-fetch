import type { ResolveURLResult, UrlQuery, VerifiedFetchInit, ContentTypeParser, RequestFormatShorthand } from '../index.js'
import type { ByteRangeContext } from '../utils/byte-range-context.js'
import type { AcceptHeader } from '../utils/select-output-type.ts'
import type { ServerTiming } from '../utils/server-timing.ts'
import type { PathWalkerResponse } from '../utils/walk-path.js'
import type { IPNSResolver } from '@helia/ipns'
import type { AbortOptions, Logger } from '@libp2p/interface'
import type { Helia } from 'helia'
import type { Blockstore } from 'interface-blockstore'
import type { UnixFSEntry } from 'ipfs-unixfs-exporter'
import type { CID } from 'multiformats/cid'
import type { CustomProgressEvent } from 'progress-events'

/**
 * Contains common components and functions required by plugins to handle a request.
 * - Read-Only: Plugins can read but shouldn't rewrite them.
 * - Persistent: Relevant even after the request completes (e.g., logging or metrics).
 */
export interface PluginOptions {
  logger: Logger
  getBlockstore(cid: CID, resource: string | CID, useSession?: boolean, options?: AbortOptions): Blockstore
  contentTypeParser?: ContentTypeParser
  helia: Helia
  ipnsResolver: IPNSResolver
}

/**
 * Represents the ephemeral, modifiable state used by the pipeline.
 * - Mutable: Evolves as you walk the plugin chain.
 * - Shared Data: Allows plugins to communicate partial results, discovered data, or interim errors.
 * - Ephemeral: Typically discarded once fetch(...) completes.
 */
export interface PluginContext extends ResolveURLResult {
  readonly cid: CID
  readonly path: string
  readonly resource: string
  readonly accept?: AcceptHeader

  /**
   * An array of plugin IDs that are all enabled. You can use this to check if a plugin is enabled and respond accordingly.
   */
  plugins: string[]

  /**
   * The last time the context is modified, so we know whether a plugin has modified it.
   * A plugin should increment this value if it modifies the context.
   */
  modified: number
  onProgress?(evt: CustomProgressEvent<any>): void
  options?: Omit<VerifiedFetchInit, 'signal'> & AbortOptions
  isDirectory?: boolean
  directoryEntries?: UnixFSEntry[]
  reqFormat?: RequestFormatShorthand
  pathDetails?: PathWalkerResponse
  query: UrlQuery

  /**
   * ByteRangeContext contains information about the size of the content and range requests.
   * This can be used to set the Content-Length header without loading the entire body.
   *
   * This is set by the ByteRangeContextPlugin
   */
  byteRangeContext?: ByteRangeContext
  serverTiming: ServerTiming
  ipfsPath: string

  /**
   * Allow arbitrary keys/values
   */
  [key: string]: unknown
}

export interface VerifiedFetchPlugin {
  readonly id: string
  readonly codes: number[]
  readonly log: Logger
  canHandle (context: PluginContext): boolean
  handle (context: PluginContext): Promise<Response | null>
}

export interface VerifiedFetchPluginFactory {
  (options: PluginOptions): VerifiedFetchPlugin
}

export interface PluginErrorOptions {
  fatal?: boolean
  details?: Record<string, any>
  response?: Response
}
