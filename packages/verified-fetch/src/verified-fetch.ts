import { car } from '@helia/car'
import { ipns as heliaIpns, type IPNS } from '@helia/ipns'
import { unixfs as heliaUnixFs, type UnixFS as HeliaUnixFs } from '@helia/unixfs'
import * as ipldDagCbor from '@ipld/dag-cbor'
import * as ipldDagJson from '@ipld/dag-json'
import { code as dagPbCode } from '@ipld/dag-pb'
import { type AbortOptions, type Logger, type PeerId } from '@libp2p/interface'
import { Record as DHTRecord } from '@libp2p/kad-dht'
import { peerIdFromString } from '@libp2p/peer-id'
import { Key } from 'interface-datastore'
import toBrowserReadableStream from 'it-to-browser-readablestream'
import { code as jsonCode } from 'multiformats/codecs/json'
import { code as rawCode } from 'multiformats/codecs/raw'
import { identity } from 'multiformats/hashes/identity'
import { CustomProgressEvent } from 'progress-events'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { ByteRangeContext } from './utils/byte-range-context.js'
import { dagCborToSafeJSON } from './utils/dag-cbor-to-safe-json.js'
import { getContentDispositionFilename } from './utils/get-content-disposition-filename.js'
import { getETag } from './utils/get-e-tag.js'
import { getResolvedAcceptHeader } from './utils/get-resolved-accept-header.js'
import { getStreamFromAsyncIterable } from './utils/get-stream-from-async-iterable.js'
import { tarStream } from './utils/get-tar-stream.js'
import { parseResource } from './utils/parse-resource.js'
import { setCacheControlHeader } from './utils/response-headers.js'
import { badRequestResponse, movedPermanentlyResponse, notAcceptableResponse, notSupportedResponse, okResponse, badRangeResponse, okRangeResponse, badGatewayResponse, notFoundResponse } from './utils/responses.js'
import { selectOutputType } from './utils/select-output-type.js'
import { isObjectNode, walkPath } from './utils/walk-path.js'
import type { CIDDetail, ContentTypeParser, Resource, VerifiedFetchInit as VerifiedFetchOptions } from './index.js'
import type { RequestFormatShorthand } from './types.js'
import type { ParsedUrlStringResults } from './utils/parse-url-string'
import type { Helia } from '@helia/interface'
import type { DNSResolver } from '@multiformats/dns/resolvers'
import type { ObjectNode, UnixFSEntry } from 'ipfs-unixfs-exporter'
import type { CID } from 'multiformats/cid'

interface VerifiedFetchComponents {
  helia: Helia
  ipns?: IPNS
  unixfs?: HeliaUnixFs
}

/**
 * Potential future options for the VerifiedFetch constructor.
 */
interface VerifiedFetchInit {
  contentTypeParser?: ContentTypeParser
  dnsResolvers?: DNSResolver[]
}

interface FetchHandlerFunctionArg {
  cid: CID
  path: string
  options?: Omit<VerifiedFetchOptions, 'signal'> & AbortOptions

  /**
   * If present, the user has sent an accept header with this value - if the
   * content cannot be represented in this format a 406 should be returned
   */
  accept?: string

  /**
   * The originally requested resource
   */
  resource: string
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

/**
 * These are Accept header values that will cause content type sniffing to be
 * skipped and set to these values.
 */
const RAW_HEADERS = [
  'application/vnd.ipld.dag-json',
  'application/vnd.ipld.raw',
  'application/octet-stream'
]

/**
 * if the user has specified an `Accept` header, and it's in our list of
 * allowable "raw" format headers, use that instead of detecting the content
 * type. This avoids the user from receiving something different when they
 * signal that they want to `Accept` a specific mime type.
 */
function getOverridenRawContentType ({ headers, accept }: { headers?: HeadersInit, accept?: string }): string | undefined {
  // accept has already been resolved by getResolvedAcceptHeader, if we have it, use it.
  const acceptHeader = accept ?? new Headers(headers).get('accept') ?? ''

  // e.g. "Accept: text/html, application/xhtml+xml, application/xml;q=0.9, image/webp, */*;q=0.8"
  const acceptHeaders = acceptHeader.split(',')
    .map(s => s.split(';')[0])
    .map(s => s.trim())

  for (const mimeType of acceptHeaders) {
    if (mimeType === '*/*') {
      return
    }

    if (RAW_HEADERS.includes(mimeType ?? '')) {
      return mimeType
    }
  }
}

export class VerifiedFetch {
  private readonly helia: Helia
  private readonly ipns: IPNS
  private readonly unixfs: HeliaUnixFs
  private readonly log: Logger
  private readonly contentTypeParser: ContentTypeParser | undefined

  constructor ({ helia, ipns, unixfs }: VerifiedFetchComponents, init?: VerifiedFetchInit) {
    this.helia = helia
    this.log = helia.logger.forComponent('helia:verified-fetch')
    this.ipns = ipns ?? heliaIpns(helia)
    this.unixfs = unixfs ?? heliaUnixFs(helia)
    this.contentTypeParser = init?.contentTypeParser
    this.log.trace('created VerifiedFetch instance')
  }

  /**
   * Accepts an `ipns://...` URL as a string and returns a `Response` containing
   * a raw IPNS record.
   */
  private async handleIPNSRecord ({ resource, cid, path, options }: FetchHandlerFunctionArg): Promise<Response> {
    if (path !== '' || !resource.startsWith('ipns://')) {
      return badRequestResponse(resource, 'Invalid IPNS name')
    }

    let peerId: PeerId

    try {
      peerId = peerIdFromString(resource.replace('ipns://', ''))
    } catch (err: any) {
      this.log.error('could not parse peer id from IPNS url %s', resource)

      return badRequestResponse(resource, err)
    }

    // since this call happens after parseResource, we've already resolved the
    // IPNS name so a local copy should be in the helia datastore, so we can
    // just read it out..
    const routingKey = uint8ArrayConcat([
      uint8ArrayFromString('/ipns/'),
      peerId.toBytes()
    ])
    const datastoreKey = new Key('/dht/record/' + uint8ArrayToString(routingKey, 'base32'), false)
    const buf = await this.helia.datastore.get(datastoreKey, options)
    const record = DHTRecord.deserialize(buf)

    const response = okResponse(resource, record.value)
    response.headers.set('content-type', 'application/vnd.ipfs.ipns-record')

    return response
  }

  /**
   * Accepts a `CID` and returns a `Response` with a body stream that is a CAR
   * of the `DAG` referenced by the `CID`.
   */
  private async handleCar ({ resource, cid, options }: FetchHandlerFunctionArg): Promise<Response> {
    const c = car(this.helia)
    const stream = toBrowserReadableStream(c.stream(cid, options))

    const response = okResponse(resource, stream)
    response.headers.set('content-type', 'application/vnd.ipld.car; version=1')

    return response
  }

  /**
   * Accepts a UnixFS `CID` and returns a `.tar` file containing the file or
   * directory structure referenced by the `CID`.
   */
  private async handleTar ({ resource, cid, path, options }: FetchHandlerFunctionArg): Promise<Response> {
    if (cid.code !== dagPbCode && cid.code !== rawCode) {
      return notAcceptableResponse('only UnixFS data can be returned in a TAR file')
    }

    const stream = toBrowserReadableStream<Uint8Array>(tarStream(`/ipfs/${cid}/${path}`, this.helia.blockstore, options))

    const response = okResponse(resource, stream)
    response.headers.set('content-type', 'application/x-tar')

    return response
  }

  private async handleJson ({ resource, cid, path, accept, options }: FetchHandlerFunctionArg): Promise<Response> {
    this.log.trace('fetching %c/%s', cid, path)
    const block = await this.helia.blockstore.get(cid, options)
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

  private async handleDagCbor ({ resource, cid, path, accept, options }: FetchHandlerFunctionArg): Promise<Response> {
    this.log.trace('fetching %c/%s', cid, path)
    let terminalElement: ObjectNode | undefined
    let ipfsRoots: CID[] | undefined

    // need to walk path, if it exists, to get the terminal element
    try {
      const pathDetails = await walkPath(this.helia.blockstore, `${cid.toString()}/${path}`, options)
      ipfsRoots = pathDetails.ipfsRoots
      const potentialTerminalElement = pathDetails.terminalElement
      if (potentialTerminalElement == null) {
        return notFoundResponse(resource)
      }
      if (isObjectNode(potentialTerminalElement)) {
        terminalElement = potentialTerminalElement
      }
    } catch (err: any) {
      options?.signal?.throwIfAborted()
      if (['ERR_NO_PROP', 'ERR_NO_TERMINAL_ELEMENT'].includes(err.code)) {
        return notFoundResponse(resource)
      }

      this.log.error('error walking path %s', path, err)
      return badGatewayResponse(resource, 'Error walking path')
    }
    const block = terminalElement?.node ?? await this.helia.blockstore.get(cid, options)

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

    if (ipfsRoots != null) {
      response.headers.set('X-Ipfs-Roots', ipfsRoots.map(cid => cid.toV1().toString()).join(',')) // https://specs.ipfs.tech/http-gateways/path-gateway/#x-ipfs-roots-response-header
    }

    return response
  }

  private async handleDagPb ({ cid, path, resource, options }: FetchHandlerFunctionArg): Promise<Response> {
    let terminalElement: UnixFSEntry | undefined
    let ipfsRoots: CID[] | undefined
    let redirected = false
    const byteRangeContext = new ByteRangeContext(this.helia.logger, options?.headers)

    try {
      const pathDetails = await walkPath(this.helia.blockstore, `${cid.toString()}/${path}`, options)
      ipfsRoots = pathDetails.ipfsRoots
      terminalElement = pathDetails.terminalElement
    } catch (err: any) {
      options?.signal?.throwIfAborted()
      if (['ERR_NO_PROP', 'ERR_NO_TERMINAL_ELEMENT'].includes(err.code)) {
        return notFoundResponse(resource.toString())
      }
      this.log.error('error walking path %s', path, err)

      return badGatewayResponse(resource.toString(), 'Error walking path')
    }

    let resolvedCID = terminalElement?.cid ?? cid
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
        const stat = await this.unixfs.stat(dirCid, {
          path: rootFilePath,
          signal: options?.signal,
          onProgress: options?.onProgress
        })
        this.log.trace('found root file at %c/%s with cid %c', dirCid, rootFilePath, stat.cid)
        path = rootFilePath
        resolvedCID = stat.cid
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
    this.log.trace('calling unixfs.cat for %c/%s with offset=%o & length=%o', resolvedCID, path, offset, length)
    const asyncIter = this.unixfs.cat(resolvedCID, {
      signal: options?.signal,
      onProgress: options?.onProgress,
      offset,
      length
    })
    this.log('got async iterator for %c/%s', cid, path)

    try {
      const { stream, firstChunk } = await getStreamFromAsyncIterable(asyncIter, path ?? '', this.helia.logger, {
        onProgress: options?.onProgress,
        signal: options?.signal
      })
      byteRangeContext.setBody(stream)
      // if not a valid range request, okRangeRequest will call okResponse
      const response = okRangeResponse(resource, byteRangeContext.getBody(), { byteRangeContext, log: this.log }, {
        redirected
      })

      await this.setContentType(firstChunk, path, response)

      if (ipfsRoots != null) {
        response.headers.set('X-Ipfs-Roots', ipfsRoots.map(cid => cid.toV1().toString()).join(',')) // https://specs.ipfs.tech/http-gateways/path-gateway/#x-ipfs-roots-response-header
      }

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

  private async handleRaw ({ resource, cid, path, options, accept }: FetchHandlerFunctionArg): Promise<Response> {
    const byteRangeContext = new ByteRangeContext(this.helia.logger, options?.headers)
    const result = await this.helia.blockstore.get(cid, options)
    byteRangeContext.setBody(result)
    const response = okRangeResponse(resource, byteRangeContext.getBody(), { byteRangeContext, log: this.log }, {
      redirected: false
    })

    // if the user has specified an `Accept` header that corresponds to a raw
    // type, honour that header, so for example they don't request
    // `application/vnd.ipld.raw` but get `application/octet-stream`
    const overriddenContentType = getOverridenRawContentType({ headers: options?.headers, accept })
    if (overriddenContentType != null) {
      response.headers.set('content-type', overriddenContentType)
    } else {
      await this.setContentType(result, path, response)
    }

    return response
  }

  private async setContentType (bytes: Uint8Array, path: string, response: Response): Promise<void> {
    let contentType = 'application/octet-stream'

    if (this.contentTypeParser != null) {
      try {
        let fileName = path.split('/').pop()?.trim()
        fileName = fileName === '' ? undefined : fileName
        const parsed = this.contentTypeParser(bytes, fileName)

        if (isPromise(parsed)) {
          const result = await parsed

          if (result != null) {
            contentType = result
          }
        } else if (parsed != null) {
          contentType = parsed
        }
      } catch (err) {
        this.log.error('error parsing content type', err)
      }
    }
    this.log.trace('setting content type to "%s"', contentType)
    response.headers.set('content-type', contentType)
  }

  /**
   * If the user has not specified an Accept header or format query string arg,
   * use the CID codec to choose an appropriate handler for the block data.
   */
  private readonly codecHandlers: Record<number, FetchHandlerFunction> = {
    [dagPbCode]: this.handleDagPb,
    [ipldDagJson.code]: this.handleJson,
    [jsonCode]: this.handleJson,
    [ipldDagCbor.code]: this.handleDagCbor,
    [rawCode]: this.handleRaw,
    [identity.code]: this.handleRaw
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

    options?.onProgress?.(new CustomProgressEvent<CIDDetail>('verified-fetch:request:start', { resource }))

    // resolve the CID/path from the requested resource
    let cid: ParsedUrlStringResults['cid']
    let path: ParsedUrlStringResults['path']
    let query: ParsedUrlStringResults['query']
    let ttl: ParsedUrlStringResults['ttl']
    let protocol: ParsedUrlStringResults['protocol']
    try {
      const result = await parseResource(resource, { ipns: this.ipns, logger: this.helia.logger }, options)
      cid = result.cid
      path = result.path
      query = result.query
      ttl = result.ttl
      protocol = result.protocol
    } catch (err: any) {
      options?.signal?.throwIfAborted()
      this.log.error('error parsing resource %s', resource, err)

      return badRequestResponse(resource.toString(), err)
    }

    options?.onProgress?.(new CustomProgressEvent<CIDDetail>('verified-fetch:request:resolve', { cid, path }))

    const acceptHeader = getResolvedAcceptHeader({ query, headers: options?.headers, logger: this.helia.logger })

    const accept = selectOutputType(cid, acceptHeader)
    this.log('output type %s', accept)

    if (acceptHeader != null && accept == null) {
      return notAcceptableResponse(resource.toString())
    }

    let response: Response
    let reqFormat: RequestFormatShorthand | undefined

    const handlerArgs: FetchHandlerFunctionArg = { resource: resource.toString(), cid, path, accept, options }

    if (accept === 'application/vnd.ipfs.ipns-record') {
      // the user requested a raw IPNS record
      reqFormat = 'ipns-record'
      response = await this.handleIPNSRecord(handlerArgs)
    } else if (accept === 'application/vnd.ipld.car') {
      // the user requested a CAR file
      reqFormat = 'car'
      query.download = true
      query.filename = query.filename ?? `${cid.toString()}.car`
      response = await this.handleCar(handlerArgs)
    } else if (accept === 'application/vnd.ipld.raw') {
      // the user requested a raw block
      reqFormat = 'raw'
      query.download = true
      query.filename = query.filename ?? `${cid.toString()}.bin`
      response = await this.handleRaw(handlerArgs)
    } else if (accept === 'application/x-tar') {
      // the user requested a TAR file
      reqFormat = 'tar'
      query.download = true
      query.filename = query.filename ?? `${cid.toString()}.tar`
      response = await this.handleTar(handlerArgs)
    } else {
      this.log.trace('finding handler for cid code "%s" and output type "%s"', cid.code, accept)
      // derive the handler from the CID type
      const codecHandler = this.codecHandlers[cid.code]

      if (codecHandler == null) {
        return notSupportedResponse(`Support for codec with code ${cid.code} is not yet implemented. Please open an issue at https://github.com/ipfs/helia-verified-fetch/issues/new`)
      }
      this.log.trace('calling handler "%s"', codecHandler.name)

      response = await codecHandler.call(this, handlerArgs)
    }

    response.headers.set('etag', getETag({ cid, reqFormat, weak: false }))

    setCacheControlHeader({ response, ttl, protocol })
    // https://specs.ipfs.tech/http-gateways/path-gateway/#x-ipfs-path-response-header
    response.headers.set('X-Ipfs-Path', resource.toString())

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

    return response
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

function isPromise <T> (p?: any): p is Promise<T> {
  return p?.then != null
}
