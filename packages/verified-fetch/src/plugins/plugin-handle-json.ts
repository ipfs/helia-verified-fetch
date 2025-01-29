import * as ipldDagCbor from '@ipld/dag-cbor'
import * as ipldDagJson from '@ipld/dag-json'
import { code as jsonCode } from 'multiformats/codecs/json'
import { notAcceptableResponse, okResponse } from '../utils/responses.js'
import type { FetchHandlerPlugin, PluginContext, PluginOptions } from './types.js'

/**
 * Accepts a UnixFS `CID` and returns a `.tar` file containing the file or
 * directory structure referenced by the `CID`.
 */
export class JsonPlugin implements FetchHandlerPlugin {
  canHandle ({ cid }: PluginContext): boolean {
    return ipldDagJson.code === cid.code || jsonCode === cid.code
  }

  async handle (context: PluginContext, pluginOptions: PluginOptions): Promise<Response> {
    const { path, resource, cid, accept } = context
    const { options, getBlockstore, logger } = pluginOptions
    const session = options?.session ?? true
    const log = logger.forComponent('json-plugin')

    log.trace('fetching %c/%s', cid, path)
    const blockstore = getBlockstore(cid, resource, session, options)
    const block = await blockstore.get(cid, options)
    let body: string | Uint8Array

    if (accept === 'application/vnd.ipld.dag-cbor' || accept === 'application/cbor') {
      try {
        // if vnd.ipld.dag-cbor has been specified, convert to the format - note
        // that this supports more data types than regular JSON, the content-type
        // response header is set so the user knows to process it differently
        const obj = ipldDagJson.decode(block)
        body = ipldDagCbor.encode(obj)
      } catch (err) {
        log.error('could not transform %c to application/vnd.ipld.dag-cbor', err)
        return notAcceptableResponse(resource)
      }
    } else {
      // skip decoding
      body = block
    }

    const response = okResponse(resource, body)
    response.headers.set('content-type', accept ?? 'application/json')
    return response
  }
}
