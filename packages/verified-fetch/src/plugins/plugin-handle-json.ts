import * as ipldDagCbor from '@ipld/dag-cbor'
import * as ipldDagJson from '@ipld/dag-json'
import { code as jsonCode } from 'multiformats/codecs/json'
import { notAcceptableResponse, okResponse } from '../utils/responses.js'
import { BasePlugin } from './plugin-base.js'
import type { PluginContext } from './types.js'

/**
 * Accepts a UnixFS `CID` and returns a `.tar` file containing the file or
 * directory structure referenced by the `CID`.
 */
export class JsonPlugin extends BasePlugin {
  readonly codes = [ipldDagJson.code, jsonCode]
  canHandle ({ cid, accept }: PluginContext): boolean {
    const log = this.log
    log('checking if we can handle %c with accept %s', cid, accept)

    if (accept === 'application/vnd.ipld.dag-json' && cid.code !== ipldDagCbor.code) {
      // we can handle application/vnd.ipld.dag-json, but if the CID codec is ipldDagCbor, DagCborPlugin should handle it
      // TODO: remove the need for deny-listing cases in plugins
      return true
    }

    return ipldDagJson.code === cid.code || jsonCode === cid.code
  }

  async handle (context: PluginContext): Promise<Response> {
    const { path, resource, cid, accept, options } = context
    const { getBlockstore } = this.pluginOptions
    const session = options?.session ?? true
    const log = this.log

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
