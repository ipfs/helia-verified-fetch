import * as ipldDagCbor from '@ipld/dag-cbor'
import * as ipldDagJson from '@ipld/dag-json'
import { dagCborToSafeJSON } from '../utils/dag-cbor-to-safe-json.js'
import { setIpfsRoots } from '../utils/response-headers.js'
import { notAcceptableResponse, okRangeResponse } from '../utils/responses.js'
import { isObjectNode } from '../utils/walk-path.js'
import { BasePlugin } from './plugin-base.js'
import type { PluginContext } from './types.js'
import type { ObjectNode } from 'ipfs-unixfs-exporter'

/**
 * Handles `dag-cbor` content, including requests with Accept: `application/vnd.ipld.dag-json` and `application/json`.
 */
export class DagCborPlugin extends BasePlugin {
  readonly id = 'dag-cbor-plugin'
  readonly codes = [ipldDagCbor.code]

  canHandle ({ cid, accept, pathDetails, byteRangeContext, plugins }: PluginContext): boolean {
    if (pathDetails == null) {
      return false
    }

    if (!isObjectNode(pathDetails.terminalElement)) {
      return false
    }

    if (cid.code !== ipldDagCbor.code) {
      return false
    }

    if (byteRangeContext == null) {
      return false
    }

    if (accept != null && accept.mimeType === 'text/html' && plugins.includes('dag-cbor-plugin-html-preview')) {
      // let the dag-cbor-html-preview plugin handle it
      return false
    }

    return isObjectNode(pathDetails.terminalElement)
  }

  async handle (context: PluginContext & Required<Pick<PluginContext, 'byteRangeContext' | 'pathDetails'>> & { pathDetails: { terminalElement: ObjectNode } }): Promise<Response> {
    const { cid, path, resource, accept, pathDetails: { terminalElement, ipfsRoots } } = context

    this.log.trace('fetching %c/%s', cid, path)

    const block = terminalElement.node

    let body: string | Uint8Array

    if (accept?.mimeType === 'application/octet-stream' || accept?.mimeType === 'application/vnd.ipld.dag-cbor' || accept?.mimeType === 'application/cbor') {
      // skip decoding
      body = block
    } else if (accept?.mimeType === 'application/vnd.ipld.dag-json') {
      try {
        // if vnd.ipld.dag-json has been specified, convert to the format - note
        // that this supports more data types than regular JSON, the content-type
        // response header is set so the user knows to process it differently
        const obj = ipldDagCbor.decode(block)
        body = ipldDagJson.encode(obj)
      } catch (err) {
        this.log.error('could not transform %c to application/vnd.ipld.dag-json', err)
        return notAcceptableResponse(resource)
      }
    } else {
      try {
        body = dagCborToSafeJSON(block)
      } catch (err) {
        if (accept?.mimeType === 'application/json') {
          this.log('could not decode DAG-CBOR as JSON-safe, but the client sent "Accept: application/json"', err)

          return notAcceptableResponse(resource)
        }

        this.log('could not decode DAG-CBOR as JSON-safe, falling back to `application/octet-stream`', err)
        body = block
      }
    }

    context.byteRangeContext.setBody(body)

    const responseContentType = accept?.mimeType ?? (body instanceof Uint8Array ? 'application/octet-stream' : 'application/json')
    const response = okRangeResponse(resource, context.byteRangeContext.getBody(responseContentType), { byteRangeContext: context.byteRangeContext, log: this.log })

    response.headers.set('content-type', context.byteRangeContext.getContentType() ?? responseContentType)

    this.log.trace('setting content type to "%s"', context.byteRangeContext.getContentType() ?? responseContentType)
    setIpfsRoots(response, ipfsRoots)

    return response
  }
}
