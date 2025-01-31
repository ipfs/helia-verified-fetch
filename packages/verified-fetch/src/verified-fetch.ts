import { ipns as heliaIpns, type IPNS } from '@helia/ipns'
import { type AbortOptions, type Logger } from '@libp2p/interface'
import { prefixLogger } from '@libp2p/logger'
import { LRUCache } from 'lru-cache'
import { type CID } from 'multiformats/cid'
import { CustomProgressEvent } from 'progress-events'
import { CarPlugin } from './plugins/plugin-handle-car.js'
import { DagCborPlugin } from './plugins/plugin-handle-dag-cbor.js'
import { DagPbPlugin } from './plugins/plugin-handle-dag-pb.js'
import { IpnsRecordPlugin } from './plugins/plugin-handle-ipns-record.js'
import { JsonPlugin } from './plugins/plugin-handle-json.js'
import { RawPlugin } from './plugins/plugin-handle-raw.js'
import { TarPlugin } from './plugins/plugin-handle-tar.js'
import { getContentDispositionFilename } from './utils/get-content-disposition-filename.js'
import { getETag } from './utils/get-e-tag.js'
import { getResolvedAcceptHeader } from './utils/get-resolved-accept-header.js'
import { getRedirectResponse } from './utils/handle-redirects.js'
import { parseResource } from './utils/parse-resource.js'
import { type ParsedUrlStringResults } from './utils/parse-url-string.js'
import { resourceToSessionCacheKey } from './utils/resource-to-cache-key.js'
import { setCacheControlHeader } from './utils/response-headers.js'
import { badRequestResponse, notAcceptableResponse, notSupportedResponse, badGatewayResponse } from './utils/responses.js'
import { selectOutputType } from './utils/select-output-type.js'
import { serverTiming } from './utils/server-timing.js'
import type { CIDDetail, ContentTypeParser, CreateVerifiedFetchOptions, Resource, ResourceDetail, VerifiedFetchInit as VerifiedFetchOptions } from './index.js'
import type { FetchHandlerPlugin, PluginContext, PluginOptions } from './plugins/types.js'
import type { RequestFormatShorthand } from './types.js'
import type { Helia, SessionBlockstore } from '@helia/interface'
import type { Blockstore } from 'interface-blockstore'

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

// TODO: merge/combine with PluginContext
interface FinalResponseContext {
  cid?: ParsedUrlStringResults['cid']
  reqFormat?: RequestFormatShorthand
  ttl?: ParsedUrlStringResults['ttl']
  protocol?: ParsedUrlStringResults['protocol']
  ipfsPath?: string
  query?: ParsedUrlStringResults['query']
}

export class VerifiedFetch {
  private readonly helia: Helia
  private readonly ipns: IPNS
  private readonly log: Logger
  private readonly contentTypeParser: ContentTypeParser | undefined
  private readonly blockstoreSessions: LRUCache<string, SessionBlockstore>
  private serverTimingHeaders: string[] = []
  private readonly withServerTiming: boolean
  private readonly plugins: FetchHandlerPlugin[] = []

  constructor ({ helia, ipns }: VerifiedFetchComponents, init?: CreateVerifiedFetchOptions) {
    this.helia = helia
    this.log = helia.logger.forComponent('helia:verified-fetch')
    this.ipns = ipns ?? heliaIpns(helia)
    this.contentTypeParser = init?.contentTypeParser
    this.blockstoreSessions = new LRUCache({
      max: init?.sessionCacheSize ?? SESSION_CACHE_MAX_SIZE,
      ttl: init?.sessionTTLms ?? SESSION_CACHE_TTL_MS,
      dispose: (store) => {
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

    this.plugins = [
      new IpnsRecordPlugin(pluginOptions),
      new CarPlugin(pluginOptions),
      new RawPlugin(pluginOptions),
      new TarPlugin(pluginOptions),
      new JsonPlugin(pluginOptions),
      new DagCborPlugin(pluginOptions),
      new DagPbPlugin(pluginOptions)
    ]
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
  private handleFinalResponse (response: Response, { query, cid, reqFormat, ttl, protocol, ipfsPath }: FinalResponseContext = {}): Response {
    if (this.serverTimingHeaders.length > 0) {
      const headerString = this.serverTimingHeaders.join(', ')
      response.headers.set('Server-Timing', headerString)
      this.serverTimingHeaders = []
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

    if (cid != null) {
      response.headers.set('etag', getETag({ cid, reqFormat, weak: false }))
    }

    if (protocol != null) {
      setCacheControlHeader({ response, ttl, protocol })
    }
    if (ipfsPath != null) {
      response.headers.set('X-Ipfs-Path', ipfsPath)
    }

    return response
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

    const options = convertOptions(opts)
    const withServerTiming = options?.withServerTiming ?? this.withServerTiming

    options?.onProgress?.(new CustomProgressEvent<ResourceDetail>('verified-fetch:request:start', { resource }))
    // resolve the CID/path from the requested resource
    let cid: ParsedUrlStringResults['cid']
    let path: ParsedUrlStringResults['path']
    let query: ParsedUrlStringResults['query']
    let ttl: ParsedUrlStringResults['ttl']
    let protocol: ParsedUrlStringResults['protocol']
    let ipfsPath: string
    try {
      const result = await this.handleServerTiming('parse-resource', '', async () => parseResource(resource, { ipns: this.ipns, logger: this.helia.logger }, { withServerTiming, ...options }), withServerTiming)
      cid = result.cid
      path = result.path
      query = result.query
      ttl = result.ttl
      protocol = result.protocol
      ipfsPath = result.ipfsPath
      this.serverTimingHeaders.push(...result.serverTimings.map(({ header }) => header))
    } catch (err: any) {
      options?.signal?.throwIfAborted()
      this.log.error('error parsing resource %s', resource, err)

      return this.handleFinalResponse(badRequestResponse(resource.toString(), err))
    }

    options?.onProgress?.(new CustomProgressEvent<CIDDetail>('verified-fetch:request:resolve', { cid, path }))

    const acceptHeader = getResolvedAcceptHeader({ query, headers: options?.headers, logger: this.helia.logger })

    const accept: string | undefined = selectOutputType(cid, acceptHeader)
    this.log('output type %s', accept)

    if (acceptHeader != null && accept == null) {
      return this.handleFinalResponse(notAcceptableResponse(resource.toString()))
    }

    const responseContentType: string = accept?.split(';')[0] ?? 'application/octet-stream'

    let response: Response | undefined
    let reqFormat: RequestFormatShorthand | undefined

    const redirectResponse = await getRedirectResponse({ resource, options, logger: this.helia.logger, cid })
    if (redirectResponse != null) {
      return this.handleFinalResponse(redirectResponse)
    }

    const context: PluginContext = { cid, path, resource: resource.toString(), accept, reqFormat, query, options, withServerTiming, onProgress: options?.onProgress }

    this.log.trace('finding handler for cid code "%s" and response content type "%s"', cid.code, responseContentType)
    const plugins = this.plugins.filter(p => p.canHandle(context))

    if (plugins.length > 0) {
      this.log.trace('found %d plugins that can handle request: %s', plugins.length, plugins.map(p => p.constructor.name).join(', '))
      for (const plugin of plugins) {
        try {
          this.log.trace('using plugin "%s"', plugin.constructor.name)
          response = await plugin.handle(context)
          const pluginContentType = response?.headers.get('content-type') ?? 'UNKNOWN'

          this.log.trace('plugin "%s" response.ok: %s, plugins response content type: %s', plugin.constructor.name, response?.ok, pluginContentType)
          // if the response is not null, and of the correct format, we can break out of the loop
          if (response?.ok) {
          // if (response?.ok && pluginContentType.startsWith(responseContentType)) {
            // TODO: limit the number of plugins that can handle a request as much as possible. can we pass responseContentType and restrict the plugins that can handle it?
            // we already have a list of known CID-> content types in CID_TYPE_MAP - can we use that to restrict the plugins that can handle a request?
            this.log.trace('plugin "%s" handled request', plugin.constructor.name)
            break
          }
        } catch (err: any) {
          options?.signal?.throwIfAborted()
          this.log.error('plugin "%s" failed to handle request', plugin.constructor.name, err)
          if (err.name === 'PluginFatalError') {
            let response = badGatewayResponse(resource.toString(), 'Failed to fetch')
            // eslint-disable-next-line max-depth
            if (err.response != null) {
              this.log.trace('plugin "%s" returned fatal response', plugin.constructor.name)
              response = err.response
            }
            return this.handleFinalResponse(response, {
              query: {
                ...query,
                ...context.query
              },
              cid,
              reqFormat: context.reqFormat,
              ttl,
              protocol,
              ipfsPath
            })
          }
        } finally {
          reqFormat = context.reqFormat
          query = {
            ...query,
            ...context.query
          }
        }
      }
    } else {
      this.log.trace('no plugins found that can handle request. Calling plugin by supported codec')
      const plugin = this.plugins.find(p => p.codes.includes(cid.code))
      if (plugin != null) {
        try {
          response = await plugin.handle(context)
        } catch (err: any) {
          options?.signal?.throwIfAborted()
          this.log.error('plugin "%s" failed to handle request', plugin.constructor.name, err)
          if (err.name === 'PluginFatalError') {
            let response = badGatewayResponse(resource.toString(), 'Failed to fetch')
            // eslint-disable-next-line max-depth
            if (err.response != null) {
              this.log.trace('plugin "%s" returned fatal response', plugin.constructor.name)
              response = err.response
            }
            return this.handleFinalResponse(response, {
              query: {
                ...query,
                ...context.query
              },
              cid,
              reqFormat: context.reqFormat,
              ttl,
              protocol,
              ipfsPath
            })
          }
        } finally {
          reqFormat = context.reqFormat
          query = {
            ...query,
            ...context.query
          }
        }
      } else {
        return this.handleFinalResponse(notSupportedResponse(`Support for codec with code ${cid.code} is not yet implemented. Please open an issue at https://github.com/ipfs/helia-verified-fetch/issues/new`))
      }
    }

    options?.onProgress?.(new CustomProgressEvent<CIDDetail>('verified-fetch:request:end', { cid, path }))

    if (response == null) {
      return this.handleFinalResponse(notSupportedResponse(resource.toString()), { query, cid, reqFormat, ttl, protocol, ipfsPath })
    }

    return this.handleFinalResponse(response, { query, cid, reqFormat, ttl, protocol, ipfsPath })
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
