import { isPromise } from '@libp2p/utils'
import toBuffer from 'it-to-buffer'
import { MEDIA_TYPE_OCTET_STREAM, MEDIA_TYPE_RAW } from '../utils/content-types.ts'
import { getContentDispositionFilename } from '../utils/get-content-disposition-filename.ts'
import { okResponse, partialContentResponse } from '../utils/responses.ts'
import { BasePlugin } from './plugin-base.ts'
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
    const { url, resource, accept, ipfsRoots, terminalElement, blockstore, requestedMimeTypes } = context

    this.log.trace('fetching %c%s', terminalElement.cid, url.pathname)
    const block = await toBuffer(blockstore.get(terminalElement.cid, context))

    let contentType = accept
      .find(value => value.contentType.mediaType === MEDIA_TYPE_RAW || value.contentType.mediaType === MEDIA_TYPE_OCTET_STREAM)?.contentType.mediaType ?? MEDIA_TYPE_RAW

    // path-gateway spec §3.2.4: sniff bytes unless the request explicitly carries raw or octet-stream
    const userAcceptedRaw = requestedMimeTypes.some(value =>
      value.mediaType === MEDIA_TYPE_RAW || value.mediaType === MEDIA_TYPE_OCTET_STREAM
    )

    if (contentType === MEDIA_TYPE_RAW && !userAcceptedRaw && this.pluginOptions.contentTypeParser != null) {
      const filename = url.searchParams.get('filename') ?? undefined

      try {
        const parsed = this.pluginOptions.contentTypeParser(block, filename)
        const sniffed = isPromise(parsed) ? await parsed : parsed

        if (sniffed != null) {
          this.log.trace('sniffed content type %s for raw block %c', sniffed, terminalElement.cid)
          contentType = sniffed
        }
      } catch (err) {
        this.log.error('error parsing content type - %e', err)
      }
    }

    const headers = {
      'content-length': `${block.byteLength}`,
      'content-type': contentType,
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
