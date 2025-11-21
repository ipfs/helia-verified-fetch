import { dnsLink } from '@helia/dnslink'
import { ipnsResolver } from '@helia/ipns'
import { AbortError } from '@libp2p/interface'
import { CustomProgressEvent } from 'progress-events'
import QuickLRU from 'quick-lru'
import { ByteRangeContextPlugin } from './plugins/plugin-handle-byte-range-context.js'
import { CarPlugin } from './plugins/plugin-handle-car.js'
import { CborPlugin } from './plugins/plugin-handle-cbor.js'
import { DagCborPlugin } from './plugins/plugin-handle-dag-cbor.js'
import { DagPbPlugin } from './plugins/plugin-handle-dag-pb.js'
import { DagWalkPlugin } from './plugins/plugin-handle-dag-walk.js'
import { IpnsRecordPlugin } from './plugins/plugin-handle-ipns-record.js'
import { JsonPlugin } from './plugins/plugin-handle-json.js'
import { RawPlugin } from './plugins/plugin-handle-raw.js'
import { TarPlugin } from './plugins/plugin-handle-tar.js'
import { URLResolver } from './url-resolver.ts'
import { contentTypeParser } from './utils/content-type-parser.js'
import { errorToObject } from './utils/error-to-object.ts'
import { getContentDispositionFilename } from './utils/get-content-disposition-filename.js'
import { getETag } from './utils/get-e-tag.js'
import { getResolvedAcceptHeader } from './utils/get-resolved-accept-header.js'
import { getRedirectResponse } from './utils/handle-redirects.js'
import { uriEncodeIPFSPath } from './utils/ipfs-path-to-string.ts'
import { resourceToSessionCacheKey } from './utils/resource-to-cache-key.js'
import { setCacheControlHeader } from './utils/response-headers.js'
import { badRequestResponse, notAcceptableResponse, internalServerErrorResponse, notImplementedResponse } from './utils/responses.js'
import { selectOutputType } from './utils/select-output-type.js'
import { ServerTiming } from './utils/server-timing.js'
import type { CIDDetail, ContentTypeParser, CreateVerifiedFetchOptions, ResolveURLResult, Resource, ResourceDetail, VerifiedFetchInit as VerifiedFetchOptions } from './index.js'
import type { VerifiedFetchPlugin, PluginContext, PluginOptions } from './plugins/types.js'
import type { AcceptHeader } from './utils/select-output-type.js'
import type { DNSLink } from '@helia/dnslink'
import type { Helia, SessionBlockstore } from '@helia/interface'
import type { IPNSResolver } from '@helia/ipns'
import type { AbortOptions, Logger } from '@libp2p/interface'
import type { Blockstore } from 'interface-blockstore'
import type { CID } from 'multiformats/cid'

const SESSION_CACHE_MAX_SIZE = 100
const SESSION_CACHE_TTL_MS = 60 * 1000

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
  private readonly ipnsResolver: IPNSResolver
  private readonly dnsLink: DNSLink
  private readonly log: Logger
  private readonly contentTypeParser: ContentTypeParser | undefined
  private readonly blockstoreSessions: QuickLRU<string, SessionBlockstore>
  private readonly withServerTiming: boolean
  private readonly plugins: VerifiedFetchPlugin[] = []

  constructor (helia: Helia, init: CreateVerifiedFetchOptions = {}) {
    this.helia = helia
    this.log = helia.logger.forComponent('helia:verified-fetch')
    this.ipnsResolver = init.ipnsResolver ?? ipnsResolver(helia)
    this.dnsLink = init.dnsLink ?? dnsLink(helia)
    this.contentTypeParser = init.contentTypeParser ?? contentTypeParser
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
      logger: helia.logger.forComponent('verified-fetch'),
      getBlockstore: (cid, resource, useSession, options) => this.getBlockstore(cid, resource, useSession, options),
      helia,
      contentTypeParser: this.contentTypeParser,
      ipnsResolver: this.ipnsResolver
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
      new DagPbPlugin(pluginOptions),
      new CborPlugin(pluginOptions)
    ]

    const customPlugins = init.plugins?.map((pluginFactory) => pluginFactory(pluginOptions)) ?? []

    if (customPlugins.length > 0) {
      // allow custom plugins to replace default plugins
      const defaultPluginMap = new Map(defaultPlugins.map(plugin => [plugin.id, plugin]))
      const customPluginMap = new Map(customPlugins.map(plugin => [plugin.id, plugin]))

      this.plugins = defaultPlugins.map(plugin => customPluginMap.get(plugin.id) ?? plugin)

      // Add any remaining custom plugins that don't replace a default plugin
      this.plugins.push(...customPlugins.filter(plugin => !defaultPluginMap.has(plugin.id)))
    } else {
      this.plugins = defaultPlugins
    }
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

  /**
   * The last place a Response touches in verified-fetch before being returned to the user. This is where we add the
   * Server-Timing header to the response if it has been collected. It should be used for any final processing of the
   * response before it is returned to the user.
   */
  private handleFinalResponse (response: Response, context?: Partial<PluginContext>): Response {
    if ((this.withServerTiming || context?.withServerTiming === true) && context?.serverTiming != null) {
      const timingHeader = context?.serverTiming.getHeader()

      if (timingHeader !== '') {
        response.headers.set('Server-Timing', timingHeader)
      }
    }

    // if there are multiple ranges, we should omit the content-length header. see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Transfer-Encoding
    if (response.headers.get('Transfer-Encoding') !== 'chunked') {
      if (context?.byteRangeContext != null) {
        const contentLength = context.byteRangeContext.getLength()
        if (contentLength != null) {
          this.log.trace('Setting Content-Length from byteRangeContext: %d', contentLength)
          response.headers.set('Content-Length', contentLength.toString())
        }
      }
    }

    // set Content-Disposition header
    let contentDisposition: string | undefined

    // force download if requested
    if (context?.query?.download === true) {
      this.log.trace('download requested')
      contentDisposition = 'attachment'
    }

    // override filename if requested
    if (context?.query?.filename != null) {
      this.log.trace('specific filename requested')

      if (contentDisposition == null) {
        contentDisposition = 'inline'
      }

      contentDisposition = `${contentDisposition}; ${getContentDispositionFilename(context.query.filename)}`
    }

    if (contentDisposition != null) {
      this.log.trace('content disposition %s', contentDisposition)
      response.headers.set('Content-Disposition', contentDisposition)
    }

    if (context?.cid != null && response.headers.get('etag') == null) {
      response.headers.set('etag', getETag({
        cid: context.pathDetails?.terminalElement.cid ?? context.cid,
        reqFormat: context.reqFormat,
        weak: false
      }))
    }

    if (context?.protocol != null && context.ttl != null) {
      setCacheControlHeader({
        response,
        ttl: context.ttl,
        protocol: context.protocol
      })
    }

    if (context?.ipfsPath != null) {
      response.headers.set('X-Ipfs-Path', uriEncodeIPFSPath(context.ipfsPath))
    }

    // set CORS headers. If hosting your own gateway with verified-fetch behind the scenes, you can alter these before you send the response to the client.
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Range, X-Requested-With')
    response.headers.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, X-Ipfs-Path, X-Ipfs-Roots, X-Stream-Output')

    if (context?.reqFormat !== 'car') {
      // if we are not doing streaming responses, set the Accept-Ranges header to bytes to enable range requests
      response.headers.set('Accept-Ranges', 'bytes')
    } else {
      // set accept-ranges to none to disable range requests for streaming responses
      response.headers.set('Accept-Ranges', 'none')
    }

    if (response.headers.get('Content-Type')?.includes('application/vnd.ipld.car') === true || response.headers.get('Content-Type')?.includes('application/vnd.ipld.raw') === true) {
      // see https://specs.ipfs.tech/http-gateways/path-gateway/#x-content-type-options-response-header
      response.headers.set('X-Content-Type-Options', 'nosniff')
    }

    if (context?.options?.method === 'HEAD') {
      // don't send the body for HEAD requests
      return new Response(null, {
        status: 200,
        headers: response.headers
      })
    }

    // make sure users are not expected to "download" error responses
    if (response.status > 399) {
      response.headers.delete('content-disposition')
    }

    return response
  }

  /**
   * Runs plugins in a loop. After each plugin that returns `null` (partial/no final),
   * we re-check `canHandle()` for all plugins in the next iteration if the context changed.
   */
  private async runPluginPipeline (context: PluginContext, maxPasses: number = 3): Promise<Response> {
    let finalResponse: Response | undefined
    let passCount = 0
    const pluginsUsed = new Set<string>()

    let prevModificationId = context.modified

    while (passCount < maxPasses) {
      this.log(`starting pipeline pass #${passCount + 1}`)
      passCount++

      this.log.trace('checking which plugins can handle %c%s with accept %o', context.cid, context.path.length > 0 ? `/${context.path.join('/')}` : '', context.accept)

      // gather plugins that say they can handle the *current* context, but haven't been used yet
      const readyPlugins = this.plugins.filter(p => !pluginsUsed.has(p.id)).filter(p => p.canHandle(context))

      if (readyPlugins.length === 0) {
        this.log.trace('no plugins can handle the current context, checking by CID code')
        const plugins = this.plugins.filter(p => p.codes.includes(context.cid.code))

        if (plugins.length > 0) {
          readyPlugins.push(...plugins)
        } else {
          this.log.trace('no plugins found that can handle request by CID code; exiting pipeline')
          break
        }
      }

      this.log.trace('plugins ready to handle request: %s', readyPlugins.map(p => p.id).join(', '))

      // track if any plugin changed the context or returned a response
      let contextChanged = false
      let pluginHandled = false

      for (const plugin of readyPlugins) {
        try {
          this.log('invoking plugin: %s', plugin.id)
          pluginsUsed.add(plugin.id)

          const maybeResponse = await plugin.handle(context)

          this.log('plugin response %s %o', plugin.id, maybeResponse)

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

          this.log.error('error in plugin %s - %e', plugin.id, err)

          return internalServerErrorResponse(context.resource, JSON.stringify({
            error: errorToObject(err)
          }), {
            headers: {
              'content-type': 'application/json'
            }
          })
        } finally {
          // on each plugin call, check for changes in the context
          const newModificationId = context.modified
          contextChanged = newModificationId !== prevModificationId
          if (contextChanged) {
            prevModificationId = newModificationId
          }
        }

        if (finalResponse != null) {
          this.log.trace('plugin %s produced final response', plugin.id)
          break
        }
      }

      if (pluginHandled && finalResponse != null) {
        break
      }

      if (!contextChanged) {
        this.log.trace('no context changes and no final response; exiting pipeline.')
        break
      }
    }

    return finalResponse ?? notImplementedResponse(context.resource, JSON.stringify({
      error: errorToObject(new Error('No verified fetch plugin could handle the request'))
    }), {
      headers: {
        'content-type': 'application/json'
      }
    })
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
    const serverTiming = new ServerTiming()

    const urlResolver = new URLResolver({
      ipnsResolver: this.ipnsResolver,
      dnsLink: this.dnsLink,
      timing: serverTiming
    })

    options?.onProgress?.(new CustomProgressEvent<ResourceDetail>('verified-fetch:request:start', { resource }))

    let parsedResult: ResolveURLResult

    try {
      parsedResult = await urlResolver.resolve(resource, options)
    } catch (err: any) {
      if (options?.signal?.aborted) {
        throw new AbortError(options?.signal?.reason)
      }
      this.log.error('error parsing resource %s', resource, err)

      return this.handleFinalResponse(badRequestResponse(resource.toString(), err))
    }

    options?.onProgress?.(new CustomProgressEvent<CIDDetail>('verified-fetch:request:resolve', { cid: parsedResult.cid, path: parsedResult.path }))

    const acceptHeader = getResolvedAcceptHeader({ query: parsedResult.query, headers: options?.headers, logger: this.helia.logger })

    const accept: AcceptHeader | undefined = selectOutputType(parsedResult.cid, acceptHeader)
    this.log('accept %o', accept)

    if (acceptHeader != null && accept == null) {
      this.log.error('could not fulfil request based on accept header')
      return this.handleFinalResponse(notAcceptableResponse(resource.toString()))
    }

    const responseContentType: string = accept?.mimeType.split(';')[0] ?? 'application/octet-stream'

    const redirectResponse = await getRedirectResponse({ resource, options, logger: this.helia.logger, cid: parsedResult.cid })
    if (redirectResponse != null) {
      return this.handleFinalResponse(redirectResponse)
    }

    const context: PluginContext = {
      ...parsedResult,
      resource: resource.toString(),
      accept,
      options,
      onProgress: options?.onProgress,
      modified: 0,
      plugins: this.plugins.map(p => p.id),
      query: parsedResult.query ?? {},
      withServerTiming: Boolean(options?.withServerTiming) || Boolean(this.withServerTiming),
      serverTiming
    }

    this.log.trace('finding handler for cid code "%s" and response content type "%s"', parsedResult.cid.code, responseContentType)

    const response = await this.runPluginPipeline(context)

    options?.onProgress?.(new CustomProgressEvent<CIDDetail>('verified-fetch:request:end', {
      cid: parsedResult.cid,
      path: parsedResult.path
    }))

    if (response == null) {
      this.log.error('no plugin could handle request for %s', resource)
    }

    return this.handleFinalResponse(response, context)
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
