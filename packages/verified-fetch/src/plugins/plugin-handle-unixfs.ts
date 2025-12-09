import { code as dagPbCode } from '@ipld/dag-pb'
import { isPromise } from '@libp2p/utils'
import { exporter } from 'ipfs-unixfs-exporter'
import first from 'it-first'
import itToBrowserReadableStream from 'it-to-browser-readablestream'
import toBuffer from 'it-to-buffer'
import * as raw from 'multiformats/codecs/raw'
import { MEDIA_TYPE_OCTET_STREAM, MEDIA_TYPE_UNIXFS } from '../utils/content-types.ts'
import { getContentDispositionFilename } from '../utils/get-content-disposition-filename.ts'
import { badGatewayResponse, movedPermanentlyResponse, partialContentResponse, okResponse } from '../utils/responses.js'
import { BasePlugin } from './plugin-base.js'
import type { PluginContext } from '../index.js'
import type { RangeHeader } from '../utils/get-range-header.ts'
import type { AbortOptions } from '@libp2p/interface'
import type { IdentityNode, RawNode, UnixFSEntry, UnixFSFile } from 'ipfs-unixfs-exporter'

/**
 * @see https://specs.ipfs.tech/http-gateways/path-gateway/#use-in-directory-url-normalization
 */
function getRedirectUrl (resource: string, url: URL, terminalElement: UnixFSEntry): string | undefined {
  let uri: URL

  try {
    // try the requested resource
    uri = new URL(resource)
  } catch {
    // fall back to the canonical URL
    uri = url
  }

  // directories must be requested with a trailing slash
  if (terminalElement?.type === 'directory' && !uri.pathname.endsWith('/')) {
    // make sure we append slash to end of the path
    uri.pathname += '/'

    return uri.toString()
  }
}

/**
 * Handles UnixFS content
 */
export class UnixFSPlugin extends BasePlugin {
  readonly id = 'unixfs-plugin'
  readonly codes = [dagPbCode, raw.code]

  canHandle ({ terminalElement, accept }: PluginContext): boolean {
    const supportsCid = this.codes.includes(terminalElement.cid.code)
    const supportsAccept = accept.length === 0 || accept.some(header => header.contentType.mediaType === MEDIA_TYPE_OCTET_STREAM ||
      header.contentType.mediaType === MEDIA_TYPE_UNIXFS
    )

    return supportsCid && supportsAccept
  }

  async handle (context: PluginContext): Promise<Response> {
    let { url, resource, terminalElement, ipfsRoots } = context
    let filename = url.searchParams.get('filename') ?? terminalElement.name
    let redirected: undefined | true

    if (terminalElement.type === 'directory') {
      const redirectUrl = getRedirectUrl(resource, url, terminalElement)

      if (redirectUrl != null) {
        this.log.trace('directory url normalization spec requires redirect...')

        if (context.options?.redirect === 'error') {
          this.log('could not redirect to %s as redirect option was set to "error"', redirectUrl)
          throw new TypeError('Failed to fetch')
        } else if (context.options?.redirect === 'manual') {
          this.log('returning 301 permanent redirect to %s', redirectUrl)
          return movedPermanentlyResponse(context.resource, redirectUrl)
        }

        this.log('following redirect to %s', redirectUrl)

        // fall-through simulates following the redirect?
        resource = redirectUrl
        redirected = true
      }

      const dirCid = terminalElement.cid

      // if not disabled, search the directory for an index.html file
      if (context.options?.supportDirectoryIndexes !== false) {
        const rootFilePath = 'index.html'

        try {
          this.log.trace('found directory at %c/%s, looking for index.html', dirCid, url.pathname)

          const entry = await context.serverTiming.time('exporter-dir', '', exporter(`/ipfs/${dirCid}/${rootFilePath}`, context.blockstore, context.options))

          if (entry.type === 'directory' || entry.type === 'object') {
            return badGatewayResponse(resource, 'Unable to stream content')
          }

          // use `index.html` as the file name to help with content types
          filename = rootFilePath

          this.log.trace('found directory index at %c/%s with cid %c', dirCid, rootFilePath, entry.cid)

          return await this.streamFile(resource, entry, filename, redirected, context.range, context.options)
        } catch (err: any) {
          if (err.name !== 'NotFoundError') {
            this.log.error('error loading path %c/%s - %e', dirCid, rootFilePath, err)
            throw err
          }
        }
      }

      // no index file found, return the directory listing
      const block = await toBuffer(context.blockstore.get(dirCid, context.options))

      return okResponse(resource, block, {
        headers: {
          'content-type': MEDIA_TYPE_UNIXFS,
          'content-length': `${block.byteLength}`,
          'content-disposition': `${url.searchParams.get('download') === 'true' ? 'attachment' : 'inline'}; ${
            getContentDispositionFilename(`${dirCid}.dir`)
          }`,
          'x-ipfs-roots': ipfsRoots.map(cid => cid.toV1()).join(',')
        },
        redirected
      })
    } else if (terminalElement.type === 'file' || terminalElement.type === 'raw' || terminalElement.type === 'identity') {
      this.log('streaming file')
      return this.streamFile(resource, terminalElement, filename, redirected, context.range, context.options)
    } else {
      return badGatewayResponse(resource, 'Unable to stream content')
    }
  }

  private async streamFile (resource: string, entry: UnixFSFile | RawNode | IdentityNode, filename: string, redirected?: boolean, rangeHeader?: RangeHeader, options?: AbortOptions): Promise<Response> {
    let contentType = MEDIA_TYPE_OCTET_STREAM

    // only detect content type for non-range requests to avoid loading blocks
    // we aren't going to stream to the user
    if (rangeHeader == null) {
      contentType = await this.detectContentType(entry, filename, options)
    }

    if (rangeHeader != null) {
      return partialContentResponse(resource, (offset, length) => {
        return entry.content({
          ...(options ?? {}),
          offset,
          length
        })
      }, rangeHeader, entry.size, {
        headers: {
          'content-type': contentType,
          'content-disposition': `inline; ${
          getContentDispositionFilename(filename)
        }`
        },
        redirected
      })
    }

    // nb. if streaming the output fails (network error, unresolvable block,
    // etc), a "TypeError: Failed to fetch" error will occur
    return okResponse(resource, itToBrowserReadableStream(entry.content(options)), {
      headers: {
        'content-type': contentType,
        'content-length': `${entry.size}`,
        'content-disposition': `inline; ${
          getContentDispositionFilename(filename)
        }`
      },
      redirected
    })
  }

  private async detectContentType (entry: UnixFSFile | RawNode | IdentityNode, filename?: string, options?: AbortOptions): Promise<string> {
    let buf: Uint8Array | undefined

    if (entry.type === 'raw' || entry.type === 'identity') {
      buf = entry.node
    } else {
      // read the first block of the file
      buf = await first(entry.content(options))
    }

    if (buf == null) {
      throw new Error('stream ended before first block was read')
    }

    let contentType: string | undefined

    if (this.pluginOptions.contentTypeParser != null) {
      try {
        const parsed = this.pluginOptions.contentTypeParser(buf, filename)

        if (isPromise(parsed)) {
          const result = await parsed

          if (result != null) {
            contentType = result
          }
        } else if (parsed != null) {
          contentType = parsed
        }
        this.log.trace('contentTypeParser returned %s for file with name %s', contentType, filename)
      } catch (err) {
        this.log.error('error parsing content type - %e', err)
      }
    }

    return contentType ?? MEDIA_TYPE_OCTET_STREAM
  }
}
