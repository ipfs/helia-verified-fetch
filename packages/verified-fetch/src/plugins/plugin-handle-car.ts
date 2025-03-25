import { car } from '@helia/car'
import toBrowserReadableStream from 'it-to-browser-readablestream'
import { okRangeResponse } from '../utils/responses.js'
import { BasePlugin } from './plugin-base.js'
import type { PluginContext } from './types.js'

function getFilename ({ cid, ipfsPath, query }: Pick<PluginContext, 'query' | 'cid' | 'ipfsPath'>): string {
  if (query.filename != null) {
    return query.filename
  }

  // convert context.ipfsPath to a filename. replace all / with _, replace prefix protocol with empty string
  const filename = ipfsPath.replace(/\/ipfs\//, '').replace(/\/ipns\//, '').replace(/\//g, '_')

  return `${filename}.car`
}
/**
 * Accepts a `CID` and returns a `Response` with a body stream that is a CAR
 * of the `DAG` referenced by the `CID`.
 */
export class CarPlugin extends BasePlugin {
  canHandle (context: PluginContext): boolean {
    this.log('checking if we can handle %c with accept %s', context.cid, context.accept)
    // if (context.pathDetails == null) {
    //   return false
    // }
    if (context.byteRangeContext == null) {
      return false
    }
    return context.accept?.startsWith('application/vnd.ipld.car') === true || context.query.format === 'car' // application/vnd.ipld.car
  }

  async handle (context: PluginContext & Required<Pick<PluginContext, 'byteRangeContext'>>): Promise<Response> {
    const { options, pathDetails, cid } = context
    const { getBlockstore, helia } = this.pluginOptions
    context.reqFormat = 'car'
    context.query.download = true
    context.query.filename = getFilename(context)
    const blockstore = getBlockstore(cid, context.resource, options?.session ?? true, options)
    const c = car({ blockstore, getCodec: helia.getCodec })
    const stream = toBrowserReadableStream(c.stream(pathDetails?.terminalElement.cid ?? cid, options))
    context.byteRangeContext.setBody(stream)

    const response = okRangeResponse(context.resource, context.byteRangeContext.getBody(), { byteRangeContext: context.byteRangeContext, log: this.log })
    response.headers.set('content-type', 'application/vnd.ipld.car; version=1')

    return response
  }
}
