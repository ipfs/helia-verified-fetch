import { NotUnixFSError } from '@helia/unixfs/errors'
import { code as dagPbCode } from '@ipld/dag-pb'
import toBrowserReadableStream from 'it-to-browser-readablestream'
import { code as rawCode } from 'multiformats/codecs/raw'
import { MEDIA_TYPE_TAR } from '../utils/content-types.ts'
import { getContentDispositionFilename } from '../utils/get-content-disposition-filename.ts'
import { tarStream } from '../utils/get-tar-stream.js'
import { badRequestResponse, okResponse } from '../utils/responses.js'
import { BasePlugin } from './plugin-base.js'
import type { PluginContext } from '../index.js'

/**
 * Accepts a UnixFS `CID` and returns a `.tar` file containing the file or
 * directory structure referenced by the `CID`.
 */
export class TarPlugin extends BasePlugin {
  readonly id = 'tar-plugin'
  readonly codes = []

  canHandle ({ accept }: PluginContext): boolean {
    return accept.some(header => header.contentType.mediaType === MEDIA_TYPE_TAR)
  }

  async handle (context: PluginContext): Promise<Response> {
    const { terminalElement, url, resource, options, blockstore, range } = context

    if (terminalElement.cid.code !== dagPbCode && terminalElement.cid.code !== rawCode) {
      return badRequestResponse(resource, new NotUnixFSError('Only UnixFS data can be returned in a TAR file'))
    }

    if (range != null) {
      return badRequestResponse(resource, new Error('Range requests are not supported for TAR files'))
    }

    const stream = toBrowserReadableStream<Uint8Array>(tarStream(`/ipfs/${terminalElement.cid}${url.pathname}`, blockstore, options))

    return okResponse(resource, stream, {
      redirected: context.redirected,
      headers: {
        'content-type': MEDIA_TYPE_TAR,
        'content-disposition': `attachment; ${
          getContentDispositionFilename(url.searchParams.get('filename') ?? `${terminalElement.cid.toString()}.tar`)
        }`,
        'accept-ranges': 'none'
      }
    })
  }
}
