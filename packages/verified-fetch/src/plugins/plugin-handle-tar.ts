import { code as dagPbCode } from '@ipld/dag-pb'
import toBrowserReadableStream from 'it-to-browser-readablestream'
import { code as rawCode } from 'multiformats/codecs/raw'
import { getETag } from '../utils/get-e-tag.js'
import { tarStream } from '../utils/get-tar-stream.js'
import { notAcceptableResponse, okRangeResponse } from '../utils/responses.js'
import { BasePlugin } from './plugin-base.js'
import type { PluginContext } from './types.js'

/**
 * Accepts a UnixFS `CID` and returns a `.tar` file containing the file or
 * directory structure referenced by the `CID`.
 */
export class TarPlugin extends BasePlugin {
  readonly id = 'tar-plugin'
  readonly codes = []
  canHandle ({ cid, accept, query, byteRangeContext }: PluginContext): boolean {
    this.log('checking if we can handle %c with accept %s', cid, accept)
    if (byteRangeContext == null) {
      return false
    }
    return accept === 'application/x-tar' || query.format === 'tar'
  }

  async handle (context: PluginContext & Required<Pick<PluginContext, 'byteRangeContext'>>): Promise<Response> {
    const { cid, path, resource, options, pathDetails } = context
    const { getBlockstore } = this.pluginOptions

    const terminusElement = pathDetails?.terminalElement.cid ?? cid
    if (terminusElement.code !== dagPbCode && terminusElement.code !== rawCode) {
      return notAcceptableResponse('only UnixFS data can be returned in a TAR file')
    }

    context.reqFormat = 'tar'
    context.query.download = true
    context.query.filename = context.query.filename ?? `${terminusElement.toString()}.tar`

    const blockstore = getBlockstore(terminusElement, resource, options?.session, options)
    const stream = toBrowserReadableStream<Uint8Array>(tarStream(`/ipfs/${cid}/${path}`, blockstore, options))

    context.byteRangeContext.setBody(stream)

    const response = okRangeResponse(resource, context.byteRangeContext.getBody('application/x-tar'), { byteRangeContext: context.byteRangeContext, log: this.log })
    response.headers.set('content-type', context.byteRangeContext.getContentType() ?? 'application/x-tar')

    response.headers.set('etag', getETag({ cid: terminusElement, reqFormat: context.reqFormat, weak: true }))

    return response
  }
}
