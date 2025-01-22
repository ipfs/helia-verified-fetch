import { code as dagPbCode } from '@ipld/dag-pb'
import toBrowserReadableStream from 'it-to-browser-readablestream'
import { code as rawCode } from 'multiformats/codecs/raw'
import { tarStream } from '../utils/get-tar-stream.js'
import { notAcceptableResponse, okResponse } from '../utils/responses.js'
import type { FetchHandlerPlugin, PluginContext, PluginOptions } from './types.js'

/**
 * Accepts a UnixFS `CID` and returns a `.tar` file containing the file or
 * directory structure referenced by the `CID`.
 */
export class TarPlugin implements FetchHandlerPlugin {
  canHandle ({ accept }: PluginContext): boolean {
    return accept === 'application/x-tar'
  }

  async handle (context: PluginContext, pluginOptions: PluginOptions): Promise<Response> {
    const { cid, path, resource } = context
    const { options, getBlockstore } = pluginOptions
    if (cid.code !== dagPbCode && cid.code !== rawCode) {
      return notAcceptableResponse('only UnixFS data can be returned in a TAR file')
    }

    context.reqFormat = 'tar'
    context.query.download = true
    context.query.filename = context.query.filename ?? `${cid.toString()}.tar`

    const blockstore = getBlockstore(cid, resource, options?.session, options)
    const stream = toBrowserReadableStream<Uint8Array>(tarStream(`/ipfs/${cid}/${path}`, blockstore, options))

    const response = okResponse(resource, stream)
    response.headers.set('content-type', 'application/x-tar')

    return response
  }
}
