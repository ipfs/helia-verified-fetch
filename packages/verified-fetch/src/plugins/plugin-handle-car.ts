import { car } from '@helia/car'
import toBrowserReadableStream from 'it-to-browser-readablestream'
import { okResponse } from '../utils/responses.js'
import type { FetchHandlerPlugin, PluginContext, PluginOptions } from './types.js'

/**
 * Accepts a `CID` and returns a `Response` with a body stream that is a CAR
 * of the `DAG` referenced by the `CID`.
 */
export class CarPlugin implements FetchHandlerPlugin {
  readonly codes = []
  canHandle ({ accept }: PluginContext): boolean {
    return accept?.startsWith('application/vnd.ipld.car') === true // application/vnd.ipld.car
  }

  async handle (context: PluginContext, options: PluginOptions): Promise<Response> {
    context.reqFormat = 'car'
    context.query.download = true
    context.query.filename = context.query.filename ?? `${context.cid.toString()}.car`
    const blockstore = options.getBlockstore(context.cid, context.resource, options.options?.session ?? true, options.options)
    const c = car({ blockstore, getCodec: options.helia.getCodec })
    const stream = toBrowserReadableStream(c.stream(context.cid, options.options))

    const response = okResponse(context.resource, stream)
    response.headers.set('content-type', 'application/vnd.ipld.car; version=1')

    return response
  }
}
