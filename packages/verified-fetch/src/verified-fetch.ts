import { ipns as heliaIpns } from '@helia/ipns'
import { AbortError } from '@libp2p/interface'
import { prefixLogger } from '@libp2p/logger'
import { CustomProgressEvent } from 'progress-events'
import QuickLRU from 'quick-lru'
import { ByteRangeContextPlugin } from './plugins/plugin-handle-byte-range-context.js'
import { CarPlugin } from './plugins/plugin-handle-car.js'
import { DagCborPlugin } from './plugins/plugin-handle-dag-cbor.js'
import { DagPbPlugin } from './plugins/plugin-handle-dag-pb.js'
import { DagWalkPlugin } from './plugins/plugin-handle-dag-walk.js'
import { IpnsRecordPlugin } from './plugins/plugin-handle-ipns-record.js'
import { JsonPlugin } from './plugins/plugin-handle-json.js'
import { RawPlugin } from './plugins/plugin-handle-raw.js'
import { TarPlugin } from './plugins/plugin-handle-tar.js'
import { contentTypeParser } from './utils/content-type-parser.js'
import { getContentDispositionFilename } from './utils/get-content-disposition-filename.js'
import { getETag } from './utils/get-e-tag.js'
import { getResolvedAcceptHeader } from './utils/get-resolved-accept-header.js'
import { getRedirectResponse } from './utils/handle-redirects.js'
import { parseResource } from './utils/parse-resource.js'
import { resourceToSessionCacheKey } from './utils/resource-to-cache-key.js'
import { setCacheControlHeader } from './utils/response-headers.js'
import { badRequestResponse, notAcceptableResponse, notSupportedResponse, badGatewayResponse } from './utils/responses.js'
import { selectOutputType } from './utils/select-output-type.js'
import { serverTiming } from './utils/server-timing.js'
import type { CIDDetail, ContentTypeParser, CreateVerifiedFetchOptions, Resource, ResourceDetail, VerifiedFetchInit as VerifiedFetchOptions } from './index.js'
import type { VerifiedFetchPlugin, PluginContext, PluginOptions } from './plugins/types.js'
import type { ParsedUrlStringResults } from './utils/parse-url-string.js'
import type { Helia, SessionBlockstore } from '@helia/interface'
import type { IPNS } from '@helia/ipns'
import type { AbortOptions, Logger } from '@libp2p/interface'
import type { Blockstore } from 'interface-blockstore'
import type { CID } from 'multiformats/cid'

const SESSION_CACHE_MAX_SIZE = 100
const SESSION_CACHE_TTL_MS = 60 * 1000

interface VerifiedFetchComponents {
  helia: Helia
  ipns?: IPNS
}

function convertOptions (options?: VerifiedFetchOptions): (Omit<VerifiedFetchOptions, 'signal'> & AbortOptions) | undefined {
  if (options == null) {
    return undefined
  }

  let signal: AbortSignal | undefined
  if (options?.signal === null) {
    signal = undefined
  } else {
    signal = options?.signal
  }

  return {
    ...options,
    signal
  }
}

export class VerifiedFetch {
  private readonly helia: Helia
  private readonly ipns: IPNS
  private readonly log: Logger
  private readonly contentTypeParser: ContentTypeParser | undefined
  private readonly blockstoreSessions: QuickLRU<string, SessionBlockstore>
  private serverTimingHeaders: string[] = []
  private readonly withServerTiming: boolean
  private readonly plugins: VerifiedFetchPlugin[] = []

  constructor ({ helia, ipns }: VerifiedFetchComponents, init?: CreateVerifiedFetchOptions) {
    this.helia = helia
    this.log = helia.logger.forComponent('helia:verified-fetch')
    this.ipns = ipns ?? heliaIpns(helia)
    this.contentTypeParser = init?.contentTypeParser ?? contentTypeParser
    this.blockstoreSessions = new QuickLRU({
      maxSize: init?.sessionCacheSize ?? SESSION_CACHE_MAX_SIZE,
      maxAge: init?.sessionTTLms ?? SESSION_CACHE_TTL_MS,
      onEviction: (key, store) => {
        store.close()
      }
    })
    this.withServerTiming = init?.withServerTiming ?? false

    const pluginOptions: PluginOptions = {
      ...init,
      logger: prefixLogger('helia:verified-fetch'),
      getBlockstore: (cid, resource, useSession, options) => this.getBlockstore(cid, resource, useSession, options),
      handleServerTiming: async (name, description, fn) => this.handleServerTiming(name, description, fn, this.withServerTiming),
      helia,
      contentTypeParser: this.contentTypeParser
    }

    const defaultPlugins = [
      new DagWalkPlugin(pluginOptions),
      new ByteRangeContextPlugin(pluginOptions),
      new IpnsRecordPlugin(pluginOptions),
      new CarPlugin(pluginOptions),
      new RawPlugin(pluginOptions),
      new TarPlugin(pluginOptions),
      new JsonPlugin(pluginOptions),
      new DagCborPlugin(pluginOptions),
      new DagPbPlugin(pluginOptions)
    ]

    const customPlugins = init?.plugins?.map((pluginFactory) => pluginFactory(pluginOptions)) ?? []

    if (customPlugins.length > 0) {
      // allow custom plugins to replace default plugins
      const defaultPluginMap = new Map(defaultPlugins.map(plugin => [plugin.constructor.name, plugin]))
      const customPluginMap = new Map(customPlugins.map(plugin => [plugin.constructor.name, plugin]))

      this.plugins = defaultPlugins.map(plugin => customPluginMap.get(plugin.constructor.name) ?? plugin)

      // Add any remaining custom plugins that don't replace a default plugin
      this.plugins.push(...customPlugins.filter(plugin => !defaultPluginMap.has(plugin.constructor.name)))
    } else {
      this.plugins = defaultPlugins
    }

    this.log.trace('created VerifiedFetch instance')
  }

  private getBlockstore (root: CID, resource: string | CID, useSession: boolean = true, options: AbortOptions = {}): Blockstore {
    const key = resourceToSessionCacheKey(resource)
    if (!useSession) {
      return this.helia.blockstore
    }

    let session = this.blockstoreSessions.get(key)

    if (session == null) {
      session = this.helia.blockstore.createSession(root, options)
      this.blockstoreSessions.set(key, session)
    }

    return session
  }

  private async handleServerTiming<T> (name: string, description: string, fn: () => Promise<T>, withServerTiming: boolean): Promise<T> {
    if (!withServerTiming) {
      return fn()
    }
    const { error, result, header } = await serverTiming(name, description, fn)
    this.serverTimingHeaders.push(header)
    if (error != null) {
      throw error
    }

    return result
  }

  /**
   * The last place a Response touches in verified-fetch before being returned to the user. This is where we add the
   * Server-Timing header to the response if it has been collected. It should be used for any final processing of the
   * response before it is returned to the user.
   */
  private handleFinalResponse (response: Response, { query, cid, reqFormat, ttl, protocol, ipfsPath, pathDetails, byteRangeContext, options }: Partial<PluginContext> = {}): Response {
    if (this.serverTimingHeaders.length > 0) {
      const headerString = this.serverTimingHeaders.join(', ')
      response.headers.set('Server-Timing', headerString)
      this.serverTimingHeaders = []
    }

    // if there are multiple ranges, we should omit the content-length header. see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Transfer-Encoding
    if (response.headers.get('Transfer-Encoding') !== 'chunked') {
      if (byteRangeContext != null) {
        const contentLength = byteRangeContext.length
        if (contentLength != null) {
          this.log.trace('Setting Content-Length from byteRangeContext: %d', contentLength)
          response.headers.set('Content-Length', contentLength.toString())
        }
      }
    }

    // set Content-Disposition header
    let contentDisposition: string | undefined

    this.log.trace('checking for content disposition')

    // force download if requested
    if (query?.download === true) {
      contentDisposition = 'attachment'
    } else {
      this.log.trace('download not requested')
    }

    // override filename if requested
    if (query?.filename != null) {
      if (contentDisposition == null) {
        contentDisposition = 'inline'
      }

      contentDisposition = `${contentDisposition}; ${getContentDispositionFilename(query.filename)}`
    } else {
      this.log.trace('no filename specified in query')
    }

    if (contentDisposition != null) {
      response.headers.set('Content-Disposition', contentDisposition)
    } else {
      this.log.trace('no content disposition specified')
    }

    if (cid != null && response.headers.get('etag') == null) {
      response.headers.set('etag', getETag({ cid: pathDetails?.terminalElement.cid ?? cid, reqFormat, weak: false }))
    }

    if (protocol != null) {
      setCacheControlHeader({ response, ttl, protocol })
    }
    if (ipfsPath != null) {
      response.headers.set('X-Ipfs-Path', ipfsPath)
    }

    // set CORS headers. If hosting your own gateway with verified-fetch behind the scenes, you can alter these before you send the response to the client.
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Range, X-Requested-With')
    response.headers.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, X-Ipfs-Path, X-Stream-Output')

    if (reqFormat !== 'car') {
      // if we are not doing streaming responses, set the Accept-Ranges header to bytes to enable range requests
      response.headers.set('Accept-Ranges', 'bytes')
    } else {
      // set accept-ranges to none to disable range requests for streaming responses
      response.headers.set('Accept-Ranges', 'none')
    }

    if (options?.method === 'HEAD') {
      // don't send the body for HEAD requests
      const headers = response?.headers
      return new Response(null, { status: 200, headers })
    }

    return response
  }

  /**
   * Runs plugins in a loop. After each plugin that returns `null` (partial/no final),
   * we re-check `canHandle()` for all plugins in the next iteration if the context changed.
   */
  private async runPluginPipeline (context: PluginContext, maxPasses: number = 3): Promise<Response | undefined> {
    let finalResponse: Response | undefined
    let passCount = 0
    const pluginsUsed = new Set<string>()

    let prevModificationId = context.modified

    while (passCount < maxPasses) {
      this.log(`Starting pipeline pass #${passCount + 1}`)
      passCount++

      // gather plugins that say they can handle the *current* context, but haven't been used yet
      const readyPlugins = this.plugins.filter(p => !pluginsUsed.has(p.constructor.name)).filter(p => p.canHandle(context))
      if (readyPlugins.length === 0) {
        this.log.trace('No plugins can handle the current context.. checking by CID code')
        const plugins = this.plugins.filter(p => p.codes.includes(context.cid.code))
        if (plugins.length > 0) {
          readyPlugins.push(...plugins)
        } else {
          this.log.trace('No plugins found that can handle request by CID code; exiting pipeline.')
          break
        }
      }

      this.log.trace('Plugins ready to handle request: ', readyPlugins.map(p => p.constructor.name).join(', '))

      // track if any plugin changed the context or returned a response
      let contextChanged = false
      let pluginHandled = false

      for (const plugin of readyPlugins) {
        try {
          this.log.trace('Invoking plugin:', plugin.constructor.name)
          pluginsUsed.add(plugin.constructor.name)

          const maybeResponse = await plugin.handle(context)
          if (maybeResponse != null) {
            // if a plugin returns a final Response, short-circuit
            finalResponse = maybeResponse
            pluginHandled = true
            break
          }
        } catch (err: any) {
          if (context.options?.signal?.aborted) {
            throw new AbortError(context.options?.signal?.reason)
          }
          this.log.error('Error in plugin:', plugin.constructor.name, err)
          // if fatal, short-circuit the pipeline
          if (err.name === 'PluginFatalError') {
            // if plugin provides a custom error response, return it
            return err.response ?? badGatewayResponse(context.resource, 'Failed to fetch')
          }
        } finally {
          // on each plugin call, check for changes in the context
          const newModificationId = context.modified
          contextChanged = newModificationId !== prevModificationId
          if (contextChanged) {
            prevModificationId = newModificationId
          }
        }

        if (finalResponse != null) {
          this.log.trace('Plugin produced final response:', plugin.constructor.name)
          break
        }
      }

      if (pluginHandled && finalResponse != null) {
        break
      }

      if (!contextChanged) {
        this.log.trace('No context changes and no final response; exiting pipeline.')
        break
      }
    }

    return finalResponse
  }

  /**
   * We're starting to get to the point where we need a queue or pipeline of
   * operations to perform and a single place to handle errors.
   *
   * TODO: move operations called by fetch to a queue of operations where we can
   * always exit early (and cleanly) if a given signal is aborted
   */
  async fetch (resource: Resource, opts?: VerifiedFetchOptions): Promise<Response> {
    this.log('fetch %s', resource)

    if (opts?.method === 'OPTIONS') {
      return this.handleFinalResponse(new Response(null, { status: 200 }))
    }

    const options = convertOptions(opts)
    const withServerTiming = options?.withServerTiming ?? this.withServerTiming

    options?.onProgress?.(new CustomProgressEvent<ResourceDetail>('verified-fetch:request:start', { resource }))

    let parsedResult: ParsedUrlStringResults
    try {
      parsedResult = await this.handleServerTiming('parse-resource', '', async () => parseResource(resource, { ipns: this.ipns, logger: this.helia.logger }, { withServerTiming, ...options }), withServerTiming)
      this.serverTimingHeaders.push(...parsedResult.serverTimings.map(({ header }) => header))
    } catch (err: any) {
      if (options?.signal?.aborted) {
        throw new AbortError(options?.signal?.reason)
      }
      this.log.error('error parsing resource %s', resource, err)

      return this.handleFinalResponse(badRequestResponse(resource.toString(), err))
    }

    options?.onProgress?.(new CustomProgressEvent<CIDDetail>('verified-fetch:request:resolve', { cid: parsedResult.cid, path: parsedResult.path }))

    const acceptHeader = getResolvedAcceptHeader({ query: parsedResult.query, headers: options?.headers, logger: this.helia.logger })

    const accept: string | undefined = selectOutputType(parsedResult.cid, acceptHeader)
    this.log('output type %s', accept)

    if (acceptHeader != null && accept == null) {
      return this.handleFinalResponse(notAcceptableResponse(resource.toString()))
    }

    const responseContentType: string = accept?.split(';')[0] ?? 'application/octet-stream'

    const redirectResponse = await getRedirectResponse({ resource, options, logger: this.helia.logger, cid: parsedResult.cid })
    if (redirectResponse != null) {
      return this.handleFinalResponse(redirectResponse)
    }

    const context: PluginContext = {
      ...parsedResult,
      resource: resource.toString(),
      accept,
      options,
      withServerTiming,
      onProgress: options?.onProgress,
      modified: 0
    }

    this.log.trace('finding handler for cid code "%s" and response content type "%s"', parsedResult.cid.code, responseContentType)

    const response = await this.runPluginPipeline(context)

    options?.onProgress?.(new CustomProgressEvent<CIDDetail>('verified-fetch:request:end', { cid: parsedResult.cid, path: parsedResult.path }))

    return this.handleFinalResponse(response ?? notSupportedResponse(resource.toString()), context)
  }

  /**
   * Start the Helia instance
   */
  async start (): Promise<void> {
    await this.helia.start()
  }

  /**
   * Shut down the Helia instance
   */
  async stop (): Promise<void> {
    await this.helia.stop()
  }
}
