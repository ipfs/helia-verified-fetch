import { code as dagPbCode } from '@ipld/dag-pb'
import toBrowserReadableStream from 'it-to-browser-readablestream'
import { code as rawCode } from 'multiformats/codecs/raw'
import { tarStream } from '../utils/get-tar-stream.js'
import { notAcceptableResponse, okResponse } from '../utils/responses.js'
import { BasePlugin } from './plugin-base.js'
import type { PluginContext } from './types.js'

/**
 * Accepts a UnixFS `CID` and returns a `.tar` file containing the file or
 * directory structure referenced by the `CID`.
 */
export class TarPlugin extends BasePlugin {
  readonly codes = []
  canHandle ({ cid, accept }: PluginContext): boolean {
    this.log('checking if we can handle %c with accept %s', cid, accept)
    return accept === 'application/x-tar'
  }

  async handle (context: PluginContext): Promise<Response> {
    const { cid, path, resource, options } = context
    const { getBlockstore } = this.pluginOptions
    if (cid.code !== dagPbCode && cid.code !== rawCode) {
      return notAcceptableResponse('only UnixFS data can be returned in a TAR file')
    }

    context.reqFormat = 'tar'
    context.query.download = true
    context.query.filename = context.query.filename ?? `${cid.toString()}.tar`

    // const blockstore = context.blockstore ?? getBlockstore(cid, resource, options?.session, options)
    const blockstore = getBlockstore(cid, resource, options?.session, options)
    const stream = toBrowserReadableStream<Uint8Array>(tarStream(`/ipfs/${cid}/${path}`, blockstore, options))

    const response = okResponse(resource, stream)
    response.headers.set('content-type', 'application/x-tar')

    return response
  }
}
