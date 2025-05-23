import * as ipldDagCbor from '@ipld/dag-cbor'
import * as ipldDagJson from '@ipld/dag-json'
import { code as jsonCode } from 'multiformats/codecs/json'
import { notAcceptableResponse, okRangeResponse } from '../utils/responses.js'
import { BasePlugin } from './plugin-base.js'
import type { PluginContext } from './types.js'

/**
 * Handles `dag-json` content, including requests with Accept: `application/vnd.ipld.dag-cbor` and `application/cbor`.
 */
export class JsonPlugin extends BasePlugin {
  readonly loggerName = 'json-plugin'
  readonly codes = [ipldDagJson.code, jsonCode]
  canHandle ({ cid, accept, byteRangeContext }: PluginContext): boolean {
    this.log('checking if we can handle %c with accept %s', cid, accept)
    if (byteRangeContext == null) {
      return false
    }

    if (accept === 'application/vnd.ipld.dag-json' && cid.code !== ipldDagCbor.code) {
      // we can handle application/vnd.ipld.dag-json, but if the CID codec is ipldDagCbor, DagCborPlugin should handle it
      // TODO: remove the need for deny-listing cases in plugins
      return true
    }

    return ipldDagJson.code === cid.code || jsonCode === cid.code
  }

  async handle (context: PluginContext & Required<Pick<PluginContext, 'byteRangeContext'>>): Promise<Response> {
    const { path, resource, cid, accept, options } = context
    const { getBlockstore } = this.pluginOptions
    const session = options?.session ?? true

    this.log.trace('fetching %c/%s', cid, path)

    const terminalCid = context.pathDetails?.terminalElement.cid ?? context.cid
    const blockstore = getBlockstore(terminalCid, resource, session, options)
    const block = await blockstore.get(terminalCid, options)
    let body: string | Uint8Array

    if (accept === 'application/vnd.ipld.dag-cbor' || accept === 'application/cbor') {
      try {
        // if vnd.ipld.dag-cbor has been specified, convert to the format - note
        // that this supports more data types than regular JSON, the content-type
        // response header is set so the user knows to process it differently
        const obj = ipldDagJson.decode(block)
        body = ipldDagCbor.encode(obj)
      } catch (err) {
        this.log.error('could not transform %c to application/vnd.ipld.dag-cbor', err)
        return notAcceptableResponse(resource)
      }
    } else {
      // skip decoding
      body = block
    }

    let contentType: string
    if (accept == null) {
      if (ipldDagJson.code === cid.code) {
        contentType = 'application/vnd.ipld.dag-json'
      } else {
        contentType = 'application/json'
      }
    } else {
      contentType = accept.split(';')[0]
    }

    context.byteRangeContext.setBody(body)

    const response = okRangeResponse(resource, context.byteRangeContext.getBody(), { byteRangeContext: context.byteRangeContext, log: this.log })
    this.log.trace('setting content-type to %s', contentType)
    response.headers.set('content-type', contentType)
    if (!context.byteRangeContext.isValidRangeRequest) {
      response.headers.set('content-length', body.length.toString())
    }
    return response
  }
}
