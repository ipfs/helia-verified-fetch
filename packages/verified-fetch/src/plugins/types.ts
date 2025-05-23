import type { PluginError } from './errors.js'
import type { VerifiedFetchInit } from '../index.js'
import type { ContentTypeParser, RequestFormatShorthand } from '../types.js'
import type { ByteRangeContext } from '../utils/byte-range-context.js'
import type { ParsedUrlStringResults } from '../utils/parse-url-string.js'
import type { PathWalkerResponse } from '../utils/walk-path.js'
import type { AbortOptions, ComponentLogger, Logger } from '@libp2p/interface'
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
  logger: ComponentLogger
  getBlockstore(cid: CID, resource: string | CID, useSession?: boolean, options?: AbortOptions): Blockstore
  handleServerTiming<T>(name: string, description: string, fn: () => Promise<T>, withServerTiming: boolean): Promise<T>
  contentTypeParser?: ContentTypeParser
  helia: Helia
}

/**
 * Represents the ephemeral, modifiable state used by the pipeline.
 * - Mutable: Evolves as you walk the plugin chain.
 * - Shared Data: Allows plugins to communicate partial results, discovered data, or interim errors.
 * - Ephemeral: Typically discarded once fetch(...) completes.
 */
export interface PluginContext extends ParsedUrlStringResults {
  readonly cid: CID
  readonly path: string
  readonly resource: string
  readonly accept?: string
  /**
   * The last time the context is modified, so we know whether a plugin has modified it.
   * A plugin should increment this value if it modifies the context.
   */
  modified: number
  withServerTiming?: boolean
  onProgress?(evt: CustomProgressEvent<any>): void
  options?: Omit<VerifiedFetchInit, 'signal'> & AbortOptions
  isDirectory?: boolean
  directoryEntries?: UnixFSEntry[]
  errors?: PluginError[]
  reqFormat?: RequestFormatShorthand
  pathDetails?: PathWalkerResponse
  query: ParsedUrlStringResults['query']
  /**
   * ByteRangeContext contains information about the size of the content and range requests.
   * This can be used to set the Content-Length header without loading the entire body.
   *
   * This is set by the ByteRangeContextPlugin
   */
  byteRangeContext?: ByteRangeContext
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

export interface FatalPluginErrorOptions extends PluginErrorOptions {
  response: Response
}
