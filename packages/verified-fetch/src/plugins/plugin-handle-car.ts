import { car } from '@helia/car'
import toBrowserReadableStream from 'it-to-browser-readablestream'
import { okResponse } from '../utils/responses.js'
import { BasePlugin } from './plugin-base.js'
import type { PluginContext } from './types.js'

/**
 * Accepts a `CID` and returns a `Response` with a body stream that is a CAR
 * of the `DAG` referenced by the `CID`.
 */
export class CarPlugin extends BasePlugin {
  canHandle (context: PluginContext): boolean {
    this.log('checking if we can handle %c with accept %s', context.cid, context.accept)
    return context.accept?.startsWith('application/vnd.ipld.car') === true || context.query.format === 'car' // application/vnd.ipld.car
  }

  async handle (context: PluginContext): Promise<Response> {
    const { options } = context
    const { getBlockstore, helia } = this.pluginOptions
    context.reqFormat = 'car'
    context.query.download = true
    context.query.filename = context.query.filename ?? `${context.cid.toString()}.car`
    const blockstore = getBlockstore(context.cid, context.resource, options?.session ?? true, options)
    const c = car({ blockstore, getCodec: helia.getCodec })
    const stream = toBrowserReadableStream(c.stream(context.cid, options))

    const response = okResponse(context.resource, stream)
    response.headers.set('content-type', 'application/vnd.ipld.car; version=1')

    return response
  }
}
