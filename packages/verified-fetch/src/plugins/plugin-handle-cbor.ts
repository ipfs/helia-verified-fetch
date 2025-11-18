import * as ipldDagCbor from '@ipld/dag-cbor'
import { CID } from 'multiformats/cid'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { CODEC_CBOR } from '../constants.ts'
import { cborToObject, dagCborToSafeJSON } from '../utils/dag-cbor-to-safe-json.js'
import { setIpfsRoots } from '../utils/response-headers.js'
import { notAcceptableResponse, okRangeResponse } from '../utils/responses.js'
import { isObjectNode } from '../utils/walk-path.js'
import { BasePlugin } from './plugin-base.js'
import type { PluginContext } from './types.js'
import type { ObjectNode } from 'ipfs-unixfs-exporter'

/**
 * Handles `cbor` content
 */
export class CborPlugin extends BasePlugin {
  readonly id = 'cbor-plugin'
  readonly codes = [CODEC_CBOR]

  canHandle ({ cid, pathDetails, byteRangeContext }: PluginContext): boolean {
    if (pathDetails == null) {
      return false
    }

    if (!isObjectNode(pathDetails.terminalElement)) {
      return false
    }

    if (cid.code !== CODEC_CBOR) {
      return false
    }

    if (byteRangeContext == null) {
      return false
    }

    return true
  }

  async handle (context: PluginContext & Required<Pick<PluginContext, 'byteRangeContext' | 'pathDetails'>> & { pathDetails: { terminalElement: ObjectNode } }): Promise<Response> {
    const { cid, path, resource, accept, pathDetails: { terminalElement, ipfsRoots } } = context

    this.log.trace('fetching %c/%s with accept header %s', cid, path.join('/'), accept?.mimeType)

    const block = terminalElement.node

    let responseContentType = 'application/cbor'
    let body: string | Uint8Array = block

    if (accept?.mimeType === 'application/json' || accept?.mimeType === 'application/vnd.ipld.dag-json') {
      try {
        body = dagCborToSafeJSON(block)
        responseContentType = accept.mimeType
      } catch (err) {
        this.log.error('could not decode CBOR as JSON-safe - %e', err)
        return notAcceptableResponse(resource)
      }
    } else if (accept?.mimeType === 'application/vnd.ipld.dag-cbor') {
      try {
        const obj = cborToObject(block)
        convert(obj)
        body = ipldDagCbor.encode(obj)
        responseContentType = accept.mimeType
      } catch (err) {
        this.log.error('could not translate CBOR to DAG-CBOR - %e', err)

        return notAcceptableResponse(resource)
      }
    } else if (accept?.mimeType === 'application/octet-stream' || accept?.mimeType === 'application/vnd.ipld.raw') {
      responseContentType = accept.mimeType
    }

    context.byteRangeContext.setBody(body)

    const response = okRangeResponse(resource, context.byteRangeContext.getBody(responseContentType), { byteRangeContext: context.byteRangeContext, log: this.log })

    response.headers.set('content-type', context.byteRangeContext.getContentType() ?? responseContentType)

    if (responseContentType !== 'application/json') {
      response.headers.set('content-disposition', `attachment; filename="${cid}.cbor"`)
    }

    this.log.trace('setting content type to "%s"', context.byteRangeContext.getContentType() ?? responseContentType)
    setIpfsRoots(response, ipfsRoots)

    return response
  }
}

/**
 * Turns `{ "/": string }` properties into `CID` instances and
 * `{ "/": { "bytes": base64 } }` into `Uint8Array`s
 */
function convert (obj: any): void {
  try {
    for (const key of Object.getOwnPropertyNames(obj)) {
      if (typeof obj[key]?.['/'] === 'string') {
        obj[key] = CID.parse(obj[key]['/'])
      } else if (typeof obj[key]?.['/']?.['bytes'] === 'string') {
        obj[key] = uint8ArrayFromString(obj[key]['/']['bytes'], 'base64')
      } else {
        convert(obj[key])
      }
    }
  } catch {}
}
