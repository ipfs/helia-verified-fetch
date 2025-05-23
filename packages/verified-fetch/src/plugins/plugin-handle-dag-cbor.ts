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
  readonly loggerName = 'dag-cbor-plugin'
  readonly codes = [ipldDagCbor.code]

  canHandle ({ cid, accept, pathDetails, byteRangeContext }: PluginContext): boolean {
    this.log('checking if we can handle %c with accept %s', cid, accept)
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

    return isObjectNode(pathDetails.terminalElement)
  }

  async handle (context: PluginContext & Required<Pick<PluginContext, 'byteRangeContext' | 'pathDetails'>>): Promise<Response> {
    const { cid, path, resource, accept, pathDetails } = context

    this.log.trace('fetching %c/%s', cid, path)

    const ipfsRoots = pathDetails.ipfsRoots
    const terminalElement = pathDetails.terminalElement as ObjectNode // checked in canHandle fn.

    const block = terminalElement.node

    let body: string | Uint8Array

    if (accept === 'application/octet-stream' || accept === 'application/vnd.ipld.dag-cbor' || accept === 'application/cbor') {
      // skip decoding
      body = block
    } else if (accept === 'application/vnd.ipld.dag-json') {
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
        if (accept === 'application/json') {
          this.log('could not decode DAG-CBOR as JSON-safe, but the client sent "Accept: application/json"', err)

          return notAcceptableResponse(resource)
        }

        this.log('could not decode DAG-CBOR as JSON-safe, falling back to `application/octet-stream`', err)
        body = block
      }
    }

    context.byteRangeContext.setBody(body)

    const response = okRangeResponse(resource, context.byteRangeContext.getBody(), { byteRangeContext: context.byteRangeContext, log: this.log })

    const responseContentType = accept ?? (body instanceof Uint8Array ? 'application/octet-stream' : 'application/json')

    response.headers.set('content-type', responseContentType)
    setIpfsRoots(response, ipfsRoots)

    return response
  }
}
