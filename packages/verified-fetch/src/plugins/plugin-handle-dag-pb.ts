import { unixfs } from '@helia/unixfs'
import { code as dagPbCode } from '@ipld/dag-pb'
import { AbortError } from '@libp2p/interface'
import { exporter } from 'ipfs-unixfs-exporter'
import { CustomProgressEvent } from 'progress-events'
import { getContentType } from '../utils/get-content-type.js'
import { getStreamFromAsyncIterable } from '../utils/get-stream-from-async-iterable.js'
import { setIpfsRoots } from '../utils/response-headers.js'
import { badGatewayResponse, badRangeResponse, movedPermanentlyResponse, okRangeResponse } from '../utils/responses.js'
import { BasePlugin } from './plugin-base.js'
import type { PluginContext } from './types.js'
import type { CIDDetail } from '../index.js'
import type { UnixFSEntry } from 'ipfs-unixfs-exporter'

/**
 * Handles UnixFS and dag-pb content.
 */
export class DagPbPlugin extends BasePlugin {
  readonly id = 'dag-pb-plugin'
  readonly codes = [dagPbCode]

  canHandle ({ cid, accept, pathDetails, byteRangeContext }: PluginContext): boolean {
    if (pathDetails == null) {
      return false
    }

    if (byteRangeContext == null) {
      return false
    }

    // TODO: this may be too restrictive?
    if (accept != null && accept.mimeType !== 'application/octet-stream') {
      return false
    }

    return cid.code === dagPbCode
  }

  /**
   * @see https://specs.ipfs.tech/http-gateways/path-gateway/#use-in-directory-url-normalization
   */
  getRedirectUrl (context: PluginContext): string | null {
    const { resource, path } = context
    const redirectCheckNeeded = path === '' ? !resource.toString().endsWith('/') : !path.endsWith('/')
    if (redirectCheckNeeded) {
      try {
        const url = new URL(resource.toString())
        if (url.pathname.endsWith('/')) {
          // url already has a trailing slash
          return null
        }
        // make sure we append slash to end of the path
        url.pathname = `${url.pathname}/`
        return url.toString()
      } catch (err: any) {
        // resource is likely a CID
        return `${resource.toString()}/`
      }
    }
    return null
  }

  async handle (context: PluginContext & Required<Pick<PluginContext, 'byteRangeContext' | 'pathDetails'>>): Promise<Response | null> {
    const { cid, options, pathDetails, query } = context
    const { contentTypeParser, helia, getBlockstore } = this.pluginOptions
    const log = this.log
    let resource = context.resource
    let path = context.path

    let redirected = false

    const byteRangeContext = context.byteRangeContext
    const ipfsRoots = pathDetails.ipfsRoots
    const terminalElement = pathDetails.terminalElement
    let resolvedCID = terminalElement.cid
    const fs = unixfs({ ...helia, blockstore: getBlockstore(context.cid, context.resource, options?.session ?? true, options) })

    if (terminalElement?.type === 'directory') {
      const dirCid = terminalElement.cid
      const redirectUrl = this.getRedirectUrl(context)

      if (redirectUrl != null) {
        log.trace('directory url normalization spec requires redirect...')
        if (options?.redirect === 'error') {
          log('could not redirect to %s as redirect option was set to "error"', redirectUrl)
          throw new TypeError('Failed to fetch')
        } else if (options?.redirect === 'manual') {
          log('returning 301 permanent redirect to %s', redirectUrl)
          return movedPermanentlyResponse(resource, redirectUrl)
        }
        log('following redirect to %s', redirectUrl)

        // fall-through simulates following the redirect?
        resource = redirectUrl
        redirected = true
      }

      const rootFilePath = 'index.html'
      try {
        log.trace('found directory at %c/%s, looking for index.html', cid, path)

        const entry = await context.serverTiming.time('exporter-dir', '', exporter(`/ipfs/${dirCid}/${rootFilePath}`, helia.blockstore, {
          signal: options?.signal,
          onProgress: options?.onProgress
        }))

        log.trace('found root file at %c/%s with cid %c', dirCid, rootFilePath, entry.cid)
        path = rootFilePath
        resolvedCID = entry.cid
      } catch (err: any) {
        if (options?.signal?.aborted) {
          throw new AbortError(options?.signal?.reason)
        }

        this.log.error('error loading path %c/%s - %e', dirCid, rootFilePath, err)

        context.isDirectory = true
        context.directoryEntries = []
        context.modified++

        this.log.trace('attempting to get directory entries because index.html was not found')
        for await (const dirItem of fs.ls(dirCid, { signal: options?.signal, onProgress: options?.onProgress, extended: false })) {
          context.directoryEntries.push(dirItem)
        }

        // dir-index-html plugin or dir-index-json (future idea?) plugin should handle this
        return null
      } finally {
        options?.onProgress?.(new CustomProgressEvent<CIDDetail>('verified-fetch:request:end', { cid: dirCid, path: rootFilePath }))
      }
    }

    try {
      // attempt to get the exact file size, but timeout quickly.
      const stat = await fs.stat(resolvedCID, { extended: true, signal: AbortSignal.timeout(500) })
      byteRangeContext.setFileSize(stat.size)
    } catch (err: any) {
      log.error('error getting exact file size for %c/%s - %e', cid, path, err)
      byteRangeContext.setFileSize(pathDetails.terminalElement.size)
      log.trace('using terminal element size of %d for %c/%s', pathDetails.terminalElement.size, cid, path)
    }

    try {
      const entry = await context.serverTiming.time('exporter-file', '', exporter(resolvedCID, helia.blockstore, {
        signal: options?.signal,
        onProgress: options?.onProgress
      }))

      let firstChunk: Uint8Array
      let contentType: string
      if (byteRangeContext.isValidRangeRequest) {
        contentType = await this.handleRangeRequest(context, entry)
      } else {
        const asyncIter = entry.content({
          signal: options?.signal,
          onProgress: options?.onProgress
        })
        log('got async iterator for %c/%s', cid, path)

        const streamAndFirstChunk = await context.serverTiming.time('stream-and-chunk', '', getStreamFromAsyncIterable(asyncIter, path, this.pluginOptions.logger, {
          onProgress: options?.onProgress,
          signal: options?.signal
        }))
        const stream = streamAndFirstChunk.stream
        firstChunk = streamAndFirstChunk.firstChunk
        contentType = await context.serverTiming.time('get-content-type', '', getContentType({ filename: query.filename, bytes: firstChunk, path, contentTypeParser, log }))

        byteRangeContext.setBody(stream)
      }

      // if not a valid range request, okRangeRequest will call okResponse
      const response = okRangeResponse(resource, byteRangeContext.getBody(contentType), { byteRangeContext, log }, {
        redirected
      })

      response.headers.set('Content-Type', byteRangeContext.getContentType() ?? contentType)

      setIpfsRoots(response, ipfsRoots)

      return response
    } catch (err: any) {
      if (options?.signal?.aborted) {
        throw new AbortError(options?.signal?.reason)
      }

      log.error('error streaming %c/%s - %e', cid, path, err)

      if (byteRangeContext.isRangeRequest && err.code === 'ERR_INVALID_PARAMS') {
        return badRangeResponse(resource)
      }

      return badGatewayResponse(resource, 'Unable to stream content')
    }
  }

  private async handleRangeRequest (context: PluginContext & Required<Pick<PluginContext, 'byteRangeContext' | 'pathDetails'>>, entry: UnixFSEntry): Promise<string> {
    const { path, byteRangeContext, options } = context
    const { contentTypeParser } = this.pluginOptions
    const log = this.log

    // get the first chunk in order to determine the content type
    const asyncIter = entry.content({
      signal: options?.signal,
      onProgress: options?.onProgress,
      offset: 0,
      // 8kb in order to determine the content type
      length: 8192
    })

    const { firstChunk } = await getStreamFromAsyncIterable(asyncIter, path ?? '', this.pluginOptions.logger, {
      onProgress: options?.onProgress,
      signal: options?.signal
    })
    const contentType = await context.serverTiming.time('get-content-type', '', getContentType({ bytes: firstChunk, path, contentTypeParser, log }))

    byteRangeContext?.setBody((range): AsyncGenerator<Uint8Array, void, unknown> => {
      if (options?.signal?.aborted) {
        throw new AbortError(options?.signal?.reason ?? 'aborted while streaming')
      }
      return entry.content({
        signal: options?.signal,
        onProgress: options?.onProgress,
        offset: range.start ?? 0,
        length: byteRangeContext.getLength(range)
      })
    }, contentType)

    return contentType
  }
}
