import * as ipldDagCbor from '@ipld/dag-cbor'
import { dagCborToSafeJSON } from '../utils/dag-cbor-to-safe-json.ts'
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

    this.log.trace('fetching %c/%s with accept header %s', cid, path.join('/'), accept?.mimeType)

    const block = terminalElement.node

    let responseContentType = 'application/cbor'
    let body: string | Uint8Array = block

    if (accept?.mimeType === 'application/json' || accept?.mimeType === 'application/vnd.ipld.dag-json') {
      try {
        // if vnd.ipld.dag-json has been specified, convert to the format - note
        // that this supports more data types than regular JSON
        body = dagCborToSafeJSON(body)
        responseContentType = accept.mimeType
      } catch (err) {
        this.log.error('could not decode CBOR as JSON-safe - %e', err)
        return notAcceptableResponse(resource)
      }
    } else if (accept?.mimeType === 'application/octet-stream' || accept?.mimeType === 'application/vnd.ipld.raw' || accept?.mimeType === 'application/vnd.ipld.dag-cbor') {
      responseContentType = accept.mimeType
    }

    context.byteRangeContext.setBody(body)

    // const responseContentType = accept?.mimeType ?? (body instanceof Uint8Array ? 'application/octet-stream' : 'application/json')
    const response = okRangeResponse(resource, context.byteRangeContext.getBody(responseContentType), { byteRangeContext: context.byteRangeContext, log: this.log })

    response.headers.set('content-type', context.byteRangeContext.getContentType() ?? responseContentType)

    if (responseContentType !== 'application/json') {
      context.query.download = true
      context.query.filename ??= `${cid}.cbor`
    }

    this.log.trace('setting content type to "%s"', context.byteRangeContext.getContentType() ?? responseContentType)
    setIpfsRoots(response, ipfsRoots)

    return response
  }
}
