import { ipns as heliaIpns, type IPNS } from '@helia/ipns'
import * as ipldDagCbor from '@ipld/dag-cbor'
import * as ipldDagJson from '@ipld/dag-json'
import { code as dagPbCode } from '@ipld/dag-pb'
import { type AbortOptions, type Logger } from '@libp2p/interface'
import { prefixLogger } from '@libp2p/logger'
import { exporter, type ObjectNode } from 'ipfs-unixfs-exporter'
import { LRUCache } from 'lru-cache'
import { type CID } from 'multiformats/cid'
import { code as jsonCode } from 'multiformats/codecs/json'
import { CustomProgressEvent } from 'progress-events'
import { CarPlugin } from './plugins/plugin-handle-car.js'
import { IpnsRecordPlugin } from './plugins/plugin-handle-ipns-record.js'
import { RawPlugin } from './plugins/plugin-handle-raw.js'
import { TarPlugin } from './plugins/plugin-handle-tar.js'
import { ByteRangeContext } from './utils/byte-range-context.js'
import { dagCborToSafeJSON } from './utils/dag-cbor-to-safe-json.js'
import { getContentDispositionFilename } from './utils/get-content-disposition-filename.js'
import { getETag } from './utils/get-e-tag.js'
import { getResolvedAcceptHeader } from './utils/get-resolved-accept-header.js'
import { getStreamFromAsyncIterable } from './utils/get-stream-from-async-iterable.js'
import { getRedirectResponse } from './utils/handle-redirects.js'
import { parseResource } from './utils/parse-resource.js'
import { type ParsedUrlStringResults } from './utils/parse-url-string.js'
import { resourceToSessionCacheKey } from './utils/resource-to-cache-key.js'
import { setCacheControlHeader, setIpfsRoots } from './utils/response-headers.js'
import { badRequestResponse, movedPermanentlyResponse, notAcceptableResponse, notSupportedResponse, okResponse, badRangeResponse, okRangeResponse, badGatewayResponse } from './utils/responses.js'
import { selectOutputType } from './utils/select-output-type.js'
import { serverTiming } from './utils/server-timing.js'
import { setContentType } from './utils/set-content-type.js'
import { handlePathWalking, isObjectNode } from './utils/walk-path.js'
import type { CIDDetail, ContentTypeParser, CreateVerifiedFetchOptions, Resource, ResourceDetail, VerifiedFetchInit as VerifiedFetchOptions } from './index.js'
import type { FetchHandlerPlugin, PluginContext, PluginOptions } from './plugins/types.js'
import type { FetchHandlerFunctionArg, RequestFormatShorthand } from './types.js'
import type { Helia, SessionBlockstore } from '@helia/interface'
import type { Blockstore } from 'interface-blockstore'

const SESSION_CACHE_MAX_SIZE = 100
const SESSION_CACHE_TTL_MS = 60 * 1000

interface VerifiedFetchComponents {
  helia: Helia
  ipns?: IPNS
}

interface FetchHandlerFunction {
  (options: FetchHandlerFunctionArg): Promise<Response>
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
  private readonly blockstoreSessions: LRUCache<string, SessionBlockstore>
  private serverTimingHeaders: string[] = []
  private readonly withServerTiming: boolean
  private readonly pluginOptions: PluginOptions
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

    this.pluginOptions = {
      ...init,
      logger: prefixLogger('helia:verified-fetch'),
      getBlockstore: (cid, resource, useSession, options) => this.getBlockstore(cid, resource, useSession, options),
      handleServerTiming: async (name, description, fn) => this.handleServerTiming(name, description, fn, this.withServerTiming),
      withServerTiming: this.withServerTiming,
      helia,
      contentTypeParser: this.contentTypeParser
    }

    this.plugins = [
      new IpnsRecordPlugin(),
      new CarPlugin(),
      new RawPlugin(),
      new TarPlugin()
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

  private async handleJson ({ resource, cid, path, accept, session, options }: FetchHandlerFunctionArg): Promise<Response> {
    this.log.trace('fetching %c/%s', cid, path)
    const blockstore = this.getBlockstore(cid, resource, session, options)
    const block = await blockstore.get(cid, options)
    let body: string | Uint8Array

    if (accept === 'application/vnd.ipld.dag-cbor' || accept === 'application/cbor') {
      try {
        // if vnd.ipld.dag-cbor has been specified, convert to the format - note
        // that this supports more data types than regular JSON, the content-type
        // response header is set so the user knows to process it differently
        const obj = ipldDagJson.decode(block)
        body = ipldDagCbor.encode(obj)
      } catch (err) {
        this.log.error('could not transform %c to application/vnd.ipld.dag-cbor', err)
        return notAcceptableResponse(resource)
      }
    } else {
      // skip decoding
      body = block
    }

    const response = okResponse(resource, body)
    response.headers.set('content-type', accept ?? 'application/json')
    return response
  }

  private async handleDagCbor ({ resource, cid, path, accept, session, options, withServerTiming }: FetchHandlerFunctionArg): Promise<Response> {
    this.log.trace('fetching %c/%s', cid, path)
    let terminalElement: ObjectNode
    const blockstore = this.getBlockstore(cid, resource, session, options)

    // need to walk path, if it exists, to get the terminal element
    const pathDetails = await this.handleServerTiming('path-walking', '', async () => handlePathWalking({ cid, path, resource, options, blockstore, log: this.log, withServerTiming }), withServerTiming)

    if (pathDetails instanceof Response) {
      return pathDetails
    }
    const ipfsRoots = pathDetails.ipfsRoots
    if (isObjectNode(pathDetails.terminalElement)) {
      terminalElement = pathDetails.terminalElement
    } else {
      // this should never happen, but if it does, we should log it and return notSupportedResponse
      this.log.error('terminal element is not a dag-cbor node')
      return notSupportedResponse(resource, 'Terminal element is not a dag-cbor node')
    }

    const block = terminalElement.node

    let body: string | Uint8Array

    if (accept === 'application/octet-stream' || accept === 'application/vnd.ipld.dag-cbor' || accept === 'application/cbor') {
      // skip decoding
      body = block
    } else if (accept === 'application/vnd.ipld.dag-json') {
      try {
        // if vnd.ipld.dag-json has been specified, convert to the format - note
        // that this supports more data types than regular JSON, the content-type
        // response header is set so the user knows to process it differently
        const obj = ipldDagCbor.decode(block)
        body = ipldDagJson.encode(obj)
      } catch (err) {
        this.log.error('could not transform %c to application/vnd.ipld.dag-json', err)
        return notAcceptableResponse(resource)
      }
    } else {
      try {
        body = dagCborToSafeJSON(block)
      } catch (err) {
        if (accept === 'application/json') {
          this.log('could not decode DAG-CBOR as JSON-safe, but the client sent "Accept: application/json"', err)

          return notAcceptableResponse(resource)
        }

        this.log('could not decode DAG-CBOR as JSON-safe, falling back to `application/octet-stream`', err)
        body = block
      }
    }

    const response = okResponse(resource, body)

    if (accept == null) {
      accept = body instanceof Uint8Array ? 'application/octet-stream' : 'application/json'
    }

    response.headers.set('content-type', accept)
    setIpfsRoots(response, ipfsRoots)

    return response
  }

  private async handleDagPb ({ cid, path, resource, session, options, withServerTiming }: FetchHandlerFunctionArg): Promise<Response> {
    let redirected = false
    const byteRangeContext = new ByteRangeContext(this.helia.logger, options?.headers)
    const blockstore = this.getBlockstore(cid, resource, session, options)
    const pathDetails = await this.handleServerTiming('path-walking', '', async () => handlePathWalking({ cid, path, resource, options, blockstore, log: this.log, withServerTiming }), withServerTiming)

    if (pathDetails instanceof Response) {
      return pathDetails
    }
    const ipfsRoots = pathDetails.ipfsRoots
    const terminalElement = pathDetails.terminalElement
    let resolvedCID = terminalElement.cid

    if (terminalElement?.type === 'directory') {
      const dirCid = terminalElement.cid
      const redirectCheckNeeded = path === '' ? !resource.toString().endsWith('/') : !path.endsWith('/')

      // https://specs.ipfs.tech/http-gateways/path-gateway/#use-in-directory-url-normalization
      if (redirectCheckNeeded) {
        if (options?.redirect === 'error') {
          this.log('could not redirect to %s/ as redirect option was set to "error"', resource)
          throw new TypeError('Failed to fetch')
        } else if (options?.redirect === 'manual') {
          this.log('returning 301 permanent redirect to %s/', resource)
          return movedPermanentlyResponse(resource, `${resource}/`)
        }

        // fall-through simulates following the redirect?
        resource = `${resource}/`
        redirected = true
      }

      const rootFilePath = 'index.html'
      try {
        this.log.trace('found directory at %c/%s, looking for index.html', cid, path)

        const entry = await this.handleServerTiming('exporter-dir', '', async () => exporter(`/ipfs/${dirCid}/${rootFilePath}`, this.helia.blockstore, {
          signal: options?.signal,
          onProgress: options?.onProgress
        }), withServerTiming)

        this.log.trace('found root file at %c/%s with cid %c', dirCid, rootFilePath, entry.cid)
        path = rootFilePath
        resolvedCID = entry.cid
      } catch (err: any) {
        options?.signal?.throwIfAborted()
        this.log('error loading path %c/%s', dirCid, rootFilePath, err)
        return notSupportedResponse('Unable to find index.html for directory at given path. Support for directories with implicit root is not implemented')
      } finally {
        options?.onProgress?.(new CustomProgressEvent<CIDDetail>('verified-fetch:request:end', { cid: dirCid, path: rootFilePath }))
      }
    }

    // we have a validRangeRequest & terminalElement is a file, we know the size and should set it
    if (byteRangeContext.isRangeRequest && byteRangeContext.isValidRangeRequest && terminalElement.type === 'file') {
      byteRangeContext.setFileSize(terminalElement.unixfs.fileSize())

      this.log.trace('fileSize for rangeRequest %d', byteRangeContext.getFileSize())
    }
    const offset = byteRangeContext.offset
    const length = byteRangeContext.length
    this.log.trace('calling exporter for %c/%s with offset=%o & length=%o', resolvedCID, path, offset, length)

    try {
      const entry = await this.handleServerTiming('exporter-file', '', async () => exporter(resolvedCID, this.helia.blockstore, {
        signal: options?.signal,
        onProgress: options?.onProgress
      }), withServerTiming)

      const asyncIter = entry.content({
        signal: options?.signal,
        onProgress: options?.onProgress,
        offset,
        length
      })
      this.log('got async iterator for %c/%s', cid, path)

      const { stream, firstChunk } = await this.handleServerTiming('stream-and-chunk', '', async () => getStreamFromAsyncIterable(asyncIter, path ?? '', this.helia.logger, {
        onProgress: options?.onProgress,
        signal: options?.signal
      }), withServerTiming)

      byteRangeContext.setBody(stream)
      // if not a valid range request, okRangeRequest will call okResponse
      const response = okRangeResponse(resource, byteRangeContext.getBody(), { byteRangeContext, log: this.log }, {
        redirected
      })

      await this.handleServerTiming('set-content-type', '', async () => setContentType({ bytes: firstChunk, path, response, contentTypeParser: this.contentTypeParser, log: this.log }), withServerTiming)

      setIpfsRoots(response, ipfsRoots)

      return response
    } catch (err: any) {
      options?.signal?.throwIfAborted()
      this.log.error('error streaming %c/%s', cid, path, err)
      if (byteRangeContext.isRangeRequest && err.code === 'ERR_INVALID_PARAMS') {
        return badRangeResponse(resource)
      }
      return badGatewayResponse(resource.toString(), 'Unable to stream content')
    }
  }

  /**
   * If the user has not specified an Accept header or format query string arg,
   * use the CID codec to choose an appropriate handler for the block data.
   */
  private readonly codecHandlers: Record<number, FetchHandlerFunction> = {
    [dagPbCode]: this.handleDagPb,
    [ipldDagJson.code]: this.handleJson,
    [jsonCode]: this.handleJson,
    [ipldDagCbor.code]: this.handleDagCbor
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
  private handleFinalResponse (response: Response): Response {
    if (this.serverTimingHeaders.length > 0) {
      const headerString = this.serverTimingHeaders.join(', ')
      response.headers.set('Server-Timing', headerString)
      this.serverTimingHeaders = []
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

    const accept = selectOutputType(cid, acceptHeader)
    this.log('output type %s', accept)

    if (acceptHeader != null && accept == null) {
      return this.handleFinalResponse(notAcceptableResponse(resource.toString()))
    }

    let response: Response
    let reqFormat: RequestFormatShorthand | undefined

    const redirectResponse = await getRedirectResponse({ resource, options, logger: this.helia.logger, cid })
    if (redirectResponse != null) {
      return this.handleFinalResponse(redirectResponse)
    }

    const handlerArgs: FetchHandlerFunctionArg = { resource: resource.toString(), cid, path, accept, session: options?.session ?? true, options, withServerTiming }
    const context: PluginContext = { cid, path, resource: resource.toString(), accept, reqFormat, query, options, withServerTiming }

    const pluginOptions: PluginOptions = {
      ...this.pluginOptions,
      onProgress: options?.onProgress,
      options: {
        ...this.pluginOptions.options,
        ...options
      }
    }

    const plugin = this.plugins.find(p => p.canHandle(context, pluginOptions))

    if (plugin != null) {
      this.log.trace('using plugin "%s"', plugin.constructor.name)
      response = await plugin.handle(context, pluginOptions)
      reqFormat = context.reqFormat
      query = {
        ...query,
        ...context.query
      }
    } else {
      this.log.trace('finding handler for cid code "%s" and output type "%s"', cid.code, accept)
      // derive the handler from the CID type
      const codecHandler = this.codecHandlers[cid.code]

      if (codecHandler == null) {
        return this.handleFinalResponse(notSupportedResponse(`Support for codec with code ${cid.code} is not yet implemented. Please open an issue at https://github.com/ipfs/helia-verified-fetch/issues/new`))
      }
      this.log.trace('calling handler "%s"', codecHandler.name)

      response = await codecHandler.call(this, handlerArgs)
    }

    response.headers.set('etag', getETag({ cid, reqFormat, weak: false }))

    setCacheControlHeader({ response, ttl, protocol })
    response.headers.set('X-Ipfs-Path', ipfsPath)

    // set Content-Disposition header
    let contentDisposition: string | undefined

    // force download if requested
    if (query.download === true) {
      contentDisposition = 'attachment'
    }

    // override filename if requested
    if (query.filename != null) {
      if (contentDisposition == null) {
        contentDisposition = 'inline'
      }

      contentDisposition = `${contentDisposition}; ${getContentDispositionFilename(query.filename)}`
    }

    if (contentDisposition != null) {
      response.headers.set('Content-Disposition', contentDisposition)
    }

    options?.onProgress?.(new CustomProgressEvent<CIDDetail>('verified-fetch:request:end', { cid, path }))

    return this.handleFinalResponse(response)
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
