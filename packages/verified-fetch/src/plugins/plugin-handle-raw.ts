import toBuffer from 'it-to-buffer'
import { MEDIA_TYPE_OCTET_STREAM, MEDIA_TYPE_RAW } from '../utils/content-types.ts'
import { getContentDispositionFilename } from '../utils/get-content-disposition-filename.ts'
import { okResponse, partialContentResponse } from '../utils/responses.js'
import { BasePlugin } from './plugin-base.js'
import type { PluginContext } from '../index.ts'

/**
 * Handles loading raw blocks from unsupported codecs
 */
export class RawPlugin extends BasePlugin {
  readonly id = 'raw-plugin'

  canHandle ({ accept }: PluginContext): boolean {
    const supportsAccept = accept.length === 0 ||
      accept.some(header => header.contentType.mediaType === MEDIA_TYPE_RAW ||
        header.contentType.mediaType === MEDIA_TYPE_OCTET_STREAM
      )

    return supportsAccept
  }

  async handle (context: PluginContext): Promise<Response> {
    const { url, resource, accept, ipfsRoots, terminalElement, blockstore, options } = context

    this.log.trace('fetching %c%s', terminalElement.cid, url.pathname)
    const block = await toBuffer(blockstore.get(terminalElement.cid, options))

    const headers = {
      'content-length': `${block.byteLength}`,
      'content-type': accept.some(value => value.contentType.mediaType === MEDIA_TYPE_RAW) ? MEDIA_TYPE_RAW : MEDIA_TYPE_OCTET_STREAM,
      'content-disposition': `${url.searchParams.get('download') === 'false' ? 'inline' : 'attachment'}; ${
        getContentDispositionFilename(url.searchParams.get('filename') ?? `${terminalElement.cid}.raw`)
      }`,
      'x-ipfs-roots': ipfsRoots.map(cid => cid.toV1()).join(','),
      'x-content-type-options': 'nosniff',
      'accept-ranges': 'bytes'
    }

    if (context.range != null) {
      return partialContentResponse(resource, async function * (offset, length) {
        yield block.subarray(offset, offset + length)
      }, context.range, block.byteLength, {
        redirected: context.redirected,
        headers
      })
    }

    return okResponse(resource, block, {
      redirected: context.redirected,
      headers
    })
  }
}
