import { dnsLink } from '@helia/dnslink'
import { ipnsResolver } from '@helia/ipns'
import { AbortError } from '@libp2p/interface'
import { CID } from 'multiformats/cid'
import { CustomProgressEvent } from 'progress-events'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { CarPlugin } from './plugins/plugin-handle-car.js'
import { IpldPlugin } from './plugins/plugin-handle-ipld.js'
import { IpnsRecordPlugin } from './plugins/plugin-handle-ipns-record.js'
import { TarPlugin } from './plugins/plugin-handle-tar.js'
import { UnixFSPlugin } from './plugins/plugin-handle-unixfs.js'
import { URLResolver } from './url-resolver.ts'
import { contentTypeParser } from './utils/content-type-parser.js'
import { getContentType, getSupportedContentTypes, CONTENT_TYPE_OCTET_STREAM, MEDIA_TYPE_IPNS_RECORD, MEDIA_TYPE_RAW, CONTENT_TYPE_IPNS } from './utils/content-types.ts'
import { errorToObject } from './utils/error-to-object.ts'
import { errorToResponse } from './utils/error-to-response.ts'
import { getETag, ifNoneMatches } from './utils/get-e-tag.js'
import { getRangeHeader } from './utils/get-range-header.ts'
import { parseURLString } from './utils/parse-url-string.ts'
import { setCacheControlHeader } from './utils/response-headers.js'
import { badRequestResponse, internalServerErrorResponse, notAcceptableResponse, notImplementedResponse, notModifiedResponse } from './utils/responses.js'
import { ServerTiming } from './utils/server-timing.js'
import type { AcceptHeader, CIDDetail, ContentTypeParser, CreateVerifiedFetchOptions, ResolveURLResult, Resource, ResourceDetail, VerifiedFetchInit as VerifiedFetchOptions, VerifiedFetchPlugin, PluginContext, PluginOptions } from './index.js'
import type { DNSLink } from '@helia/dnslink'
import type { Helia } from '@helia/interface'
import type { IPNSResolver } from '@helia/ipns'
import type { AbortOptions, Logger } from '@libp2p/interface'

/**
 * Retypes the `.signal` property of the options from
 * `AbortSignal | null | undefined` to `AbortSignal | undefined`.
 */
function convertOptions (options?: VerifiedFetchOptions): (Omit<VerifiedFetchOptions, 'signal'> & AbortOptions) | undefined {
  if (options == null) {
    return
  }

  return {
    ...options,
    signal: options?.signal == null ? undefined : options?.signal
  }
}

/**
 * Returns true if the quest is only for an IPNS record
 */
function isIPNSRecordRequest (headers: Headers): boolean {
  const acceptHeaders = headers.get('accept')?.split(',') ?? []

  if (acceptHeaders.length !== 1) {
    return false
  }

  const mediaType = acceptHeaders[0].split(';')[0]

  return mediaType === MEDIA_TYPE_IPNS_RECORD
}

/**
 * Returns true if the quest is only for an IPNS record
 */
function isRawBlockRequest (headers: Headers): boolean {
  const acceptHeaders = headers.get('accept')?.split(',') ?? []

  if (acceptHeaders.length !== 1) {
    return false
  }

  const mediaType = acceptHeaders[0].split(';')[0]

  return mediaType === MEDIA_TYPE_RAW
}

export class VerifiedFetch {
  private readonly helia: Helia
  private readonly ipnsResolver: IPNSResolver
  private readonly dnsLink: DNSLink
  private readonly log: Logger
  private readonly contentTypeParser: ContentTypeParser | undefined
  private readonly withServerTiming: boolean
  private readonly plugins: VerifiedFetchPlugin[] = []
  private readonly urlResolver: URLResolver

  constructor (helia: Helia, init: CreateVerifiedFetchOptions = {}) {
    this.helia = helia
    this.log = helia.logger.forComponent('helia:verified-fetch')
    this.ipnsResolver = init.ipnsResolver ?? ipnsResolver(helia)
    this.dnsLink = init.dnsLink ?? dnsLink(helia)
    this.contentTypeParser = init.contentTypeParser ?? contentTypeParser
    this.withServerTiming = init?.withServerTiming ?? false
    this.urlResolver = new URLResolver({
      ipnsResolver: this.ipnsResolver,
      dnsLink: this.dnsLink,
      helia: this.helia
    }, init)

    const pluginOptions: PluginOptions = {
      ...init,
      logger: helia.logger.forComponent('verified-fetch'),
      helia,
      contentTypeParser: this.contentTypeParser,
      ipnsResolver: this.ipnsResolver
    }

    const defaultPlugins = [
      new UnixFSPlugin(pluginOptions),
      new IpldPlugin(pluginOptions),
      new CarPlugin(pluginOptions),
      new TarPlugin(pluginOptions),
      new IpnsRecordPlugin(pluginOptions)
    ]

    const customPlugins = init.plugins?.map((pluginFactory) => pluginFactory(pluginOptions)) ?? []

    if (customPlugins.length > 0) {
      // allow custom plugins to replace default plugins
      const defaultPluginMap = new Map(defaultPlugins.map(plugin => [plugin.id, plugin]))
      const customPluginMap = new Map(customPlugins.map(plugin => [plugin.id, plugin]))

      this.plugins = defaultPlugins.map(plugin => customPluginMap.get(plugin.id) ?? plugin)

      // add any custom plugins that don't replace default ones with a higher
      // priority than anything built-in
      this.plugins.unshift(...customPlugins.filter(plugin => !defaultPluginMap.has(plugin.id)))
    } else {
      this.plugins = defaultPlugins
    }
  }

  /**
   * Load a resource from the IPFS network and ensure the retrieved data is the
   * data that was expected to be loaded.
   *
   * Like [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch)
   * but verified.
   */
  async fetch (resource: Resource, opts?: VerifiedFetchOptions): Promise<Response> {
    this.log('fetch %s %s', opts?.method ?? 'GET', resource)

    if (opts?.method === 'OPTIONS') {
      return this.handleFinalResponse(new Response(null, {
        status: 200
      }))
    }

    const options = convertOptions(opts)
    const headers = new Headers(options?.headers)
    const serverTiming = new ServerTiming()

    options?.onProgress?.(new CustomProgressEvent<ResourceDetail>('verified-fetch:request:start', { resource }))

    const range = getRangeHeader(resource.toString(), headers)

    if (range instanceof Response) {
      // invalid range request
      return this.handleFinalResponse(range)
    }

    let url: URL

    try {
      url = parseURLString(typeof resource === 'string' ? resource : `ipfs://${resource}`)
    } catch (err: any) {
      return this.handleFinalResponse(badRequestResponse(resource.toString(), err))
    }

    if (url.protocol === 'ipfs:' && url.pathname === '') {
      // if we don't need to resolve an IPNS names or traverse a DAG, we can
      // check the if-none-match header and maybe return a 304 without needing
      // to load any blocks
      if (ifNoneMatches(`"${url.hostname}"`, headers)) {
        return notModifiedResponse(resource.toString(), new Headers({
          etag: `"${url.hostname}"`,
          'cache-control': 'public, max-age=29030400, immutable'
        }))
      }
    }

    const requestedMimeTypes = getRequestedMimeTypes(url, headers.get('accept'))

    let parsedResult: ResolveURLResult

    // if just an IPNS record has been requested, don't try to load the block
    // the record points to or do any recursive IPNS resolving
    if (isIPNSRecordRequest(headers)) {
      if (url.protocol !== 'ipns:') {
        return notAcceptableResponse(url, requestedMimeTypes, [
          CONTENT_TYPE_IPNS
        ])
      }

      // @ts-expect-error ipnsRecordPlugin may not be of type IpnsRecordPlugin
      const ipnsRecordPlugin: IpnsRecordPlugin | undefined = this.plugins.find(plugin => plugin.id === 'ipns-record-plugin')

      if (ipnsRecordPlugin == null) {
        // IPNS record was requested but no IPNS Record plugin is configured?!
        return notAcceptableResponse(url, requestedMimeTypes, [])
      }

      return this.handleFinalResponse(await ipnsRecordPlugin.handle({
        range,
        url,
        resource: resource.toString(),
        options
      }))
    } else {
      try {
        parsedResult = await this.urlResolver.resolve(url, serverTiming, {
          ...options,
          isRawBlockRequest: isRawBlockRequest(headers),
          onlyIfCached: headers.get('cache-control') === 'only-if-cached'
        })
      } catch (err: any) {
        options?.signal?.throwIfAborted()

        this.log.error('error parsing resource %s - %e', resource, err)
        return this.handleFinalResponse(errorToResponse(resource, err))
      }
    }

    options?.onProgress?.(new CustomProgressEvent<CIDDetail>('verified-fetch:request:resolve', {
      cid: parsedResult.terminalElement.cid,
      path: parsedResult.url.pathname
    }))

    const accept = this.getAcceptHeader(parsedResult.url, requestedMimeTypes, parsedResult.terminalElement.cid)

    if (accept instanceof Response) {
      this.log('allowed media types for requested CID did not contain anything the client can understand')

      // invalid accept header
      return this.handleFinalResponse(accept)
    }

    const context: PluginContext = {
      ...parsedResult,
      resource: resource.toString(),
      accept,
      range,
      options,
      onProgress: options?.onProgress,
      serverTiming,
      headers,
      requestedMimeTypes
    }

    this.log.trace('finding handler for cid code "0x%s" and response content types %s', parsedResult.terminalElement.cid.code.toString(16), accept.map(header => header.contentType.mediaType).join(', '))

    const response = await this.runPluginPipeline(context)

    options?.onProgress?.(new CustomProgressEvent<CIDDetail>('verified-fetch:request:end', {
      cid: parsedResult.terminalElement.cid,
      path: parsedResult.url.pathname
    }))

    if (response == null) {
      this.log.error('no plugin could handle request for %s', resource)
    }

    return this.handleFinalResponse(response, Boolean(options?.withServerTiming) || Boolean(this.withServerTiming), context)
  }

  /**
   * Returns a prioritized list of acceptable content types for the response
   * based on the CID and a passed `Accept` header
   */
  private getAcceptHeader (url: URL, requestedMimeTypes: RequestedMimeType[], cid?: CID): AcceptHeader[] | Response {
    const supportedContentTypes = getSupportedContentTypes(url.protocol, cid)
    const acceptable: AcceptHeader[] = []

    for (const headerFormat of requestedMimeTypes) {
      const [headerFormatType, headerFormatSubType] = headerFormat.mediaType.split('/')

      for (const contentType of supportedContentTypes) {
        const [contentTypeType, contentTypeSubType] = contentType.mediaType.split('/')

        if (headerFormat.mediaType.includes(contentType.mediaType)) {
          acceptable.push({
            contentType,
            options: headerFormat.options
          })
        }

        if (headerFormat.mediaType === '*/*') {
          acceptable.push({
            contentType,
            options: headerFormat.options
          })
        }

        if (headerFormat.mediaType.startsWith('*/') && contentTypeSubType === headerFormatSubType) {
          acceptable.push({
            contentType,
            options: headerFormat.options
          })
        }

        if (headerFormat.mediaType.endsWith('/*') && contentTypeType === headerFormatType) {
          acceptable.push({
            contentType,
            options: headerFormat.options
          })
        }
      }
    }

    if (acceptable.length === 0) {
      this.log('requested %o', requestedMimeTypes.map(({ mediaType }) => mediaType))
      this.log('supported %o', supportedContentTypes.map(({ mediaType }) => mediaType))

      return notAcceptableResponse(url, requestedMimeTypes, supportedContentTypes)
    }

    return acceptable
  }

  /**
   * The last place a Response touches in verified-fetch before being returned
   * to the user. This is where we add the Server-Timing header to the response
   * if it has been collected. It should be used for any final processing of the
   * response before it is returned to the user.
   */
  private handleFinalResponse (response: Response, withServerTiming?: boolean, context?: PluginContext): Response {
    const contentType = getContentType(response.headers.get('content-type')) ?? CONTENT_TYPE_OCTET_STREAM

    if (withServerTiming === true && context?.serverTiming != null) {
      const timingHeader = context?.serverTiming.getHeader()

      if (timingHeader !== '') {
        response.headers.set('server-timing', timingHeader)
      }
    }

    if (context?.url?.protocol != null && context.ttl != null) {
      setCacheControlHeader({
        response,
        ttl: context.ttl,
        protocol: context.url.protocol
      })
    }

    if (context?.terminalElement.cid != null) {
      // headers can ony contain extended ASCII but IPFS paths can be unicode
      const decodedPath = decodeURI(context?.url.pathname)
      const path = uint8ArrayToString(uint8ArrayFromString(decodedPath), 'ascii')

      response.headers.set('x-ipfs-path', `/${context.url.protocol === 'ipfs:' ? 'ipfs' : 'ipns'}/${context?.url.hostname}${path}`)
    }

    // set CORS headers. If hosting your own gateway with verified-fetch behind
    // the scenes, you can alter these before you send the response to the
    // client.
    response.headers.set('access-control-allow-origin', '*')
    response.headers.set('access-control-allow-methods', 'GET, HEAD, OPTIONS')
    response.headers.set('access-control-allow-headers', 'Range, X-Requested-With')
    response.headers.set('access-control-expose-headers', 'Content-Range, Content-Length, X-Ipfs-Path, X-Ipfs-Roots, X-Stream-Output')

    if (context?.terminalElement.cid != null && response.headers.get('etag') == null) {
      const etag = getETag({
        cid: context.terminalElement.cid,
        contentType,
        ranges: context?.range?.ranges
      })

      response.headers.set('etag', etag)

      if (ifNoneMatches(etag, context?.headers)) {
        return notModifiedResponse(response.url, response.headers)
      }
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

  private async runPluginPipeline (context: PluginContext): Promise<Response> {
    let finalResponse: Response | undefined
    const pluginsUsed = new Set<string>()

    this.log.trace('checking which plugins can handle %c%s with accept %s', context.terminalElement.cid, context.url.pathname, context.accept.map(contentType => contentType.contentType.mediaType).join(', '))

    const plugins = this.plugins.filter(p => !pluginsUsed.has(p.id)).filter(p => p.canHandle(context))

    if (plugins.length === 0) {
      this.log.trace('no plugins found that can handle request; exiting pipeline')
      return notImplementedResponse(context.resource)
    }

    this.log.trace('plugins ready to handle request: %s', plugins.map(p => p.id).join(', '))

    // track if any plugin changed the context or returned a response
    const contextChanged = false
    let pluginHandled = false

    for (const plugin of plugins) {
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
      }

      if (finalResponse != null) {
        this.log.trace('plugin %s produced final response', plugin.id)
        break
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

export interface RequestedMimeType {
  mediaType: string
  options: Record<string, string>
}

function getRequestedMimeTypes (url: URL, accept?: string | null): RequestedMimeType[] {
  if (accept == null || accept === '') {
    // yolo content-type
    accept = '*/*'
  }

  return accept
    .split(',')
    .map(s => {
      const parts = s.trim().split(';')

      const options: Record<string, string> = {
        q: '1'
      }

      for (let i = 1; i < parts.length; i++) {
        const [key, value] = parts[i].split('=').map(s => s.trim())

        options[key] = value
      }

      return {
        mediaType: `${parts[0]}`.trim(),
        options
      }
    })
    .sort((a, b) => {
      if (a.options.q === b.options.q) {
        return 0
      }

      if (a.options.q > b.options.q) {
        return -1
      }

      return 1
    })
}
