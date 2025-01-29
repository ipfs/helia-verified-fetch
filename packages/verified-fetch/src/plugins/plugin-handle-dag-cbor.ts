import * as ipldDagCbor from '@ipld/dag-cbor'
import * as ipldDagJson from '@ipld/dag-json'
import { dagCborToSafeJSON } from '../utils/dag-cbor-to-safe-json.js'
import { setIpfsRoots } from '../utils/response-headers.js'
import { notAcceptableResponse, notSupportedResponse, okResponse } from '../utils/responses.js'
import { handlePathWalking, isObjectNode } from '../utils/walk-path.js'
import type { FetchHandlerPlugin, PluginContext, PluginOptions } from './types.js'
import type { ObjectNode } from 'ipfs-unixfs-exporter'

/**
 * Accepts a UnixFS `CID` and returns a `.tar` file containing the file or
 * directory structure referenced by the `CID`.
 */
export class DagCborPlugin implements FetchHandlerPlugin {
  canHandle ({ cid }: PluginContext): boolean {
    return cid.code === ipldDagCbor.code
  }

  async handle (context: PluginContext, pluginOptions: PluginOptions): Promise<Response> {
    const { cid, path, resource, accept } = context
    const { logger, options, getBlockstore, handleServerTiming, withServerTiming = false } = pluginOptions
    const log = logger.forComponent('dag-cbor-plugin')
    const session = options?.session ?? true

    log.trace('fetching %c/%s', cid, path)
    let terminalElement: ObjectNode
    const blockstore = getBlockstore(cid, resource, session, options)

    // need to walk path, if it exists, to get the terminal element
    const pathDetails = await handleServerTiming('path-walking', '', async () => handlePathWalking({ cid, path, resource, options, blockstore, log, withServerTiming }), withServerTiming)

    if (pathDetails instanceof Response) {
      return pathDetails
    }
    const ipfsRoots = pathDetails.ipfsRoots
    if (isObjectNode(pathDetails.terminalElement)) {
      terminalElement = pathDetails.terminalElement
    } else {
      // this should never happen, but if it does, we should log it and return notSupportedResponse
      log.error('terminal element is not a dag-cbor node')
      return notSupportedResponse(resource, 'Terminal element is not a dag-cbor node')
    }

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
        log.error('could not transform %c to application/vnd.ipld.dag-json', err)
        return notAcceptableResponse(resource)
      }
    } else {
      try {
        body = dagCborToSafeJSON(block)
      } catch (err) {
        if (accept === 'application/json') {
          log('could not decode DAG-CBOR as JSON-safe, but the client sent "Accept: application/json"', err)

          return notAcceptableResponse(resource)
        }

        log('could not decode DAG-CBOR as JSON-safe, falling back to `application/octet-stream`', err)
        body = block
      }
    }

    const response = okResponse(resource, body)

    const responseContentType = accept ?? (body instanceof Uint8Array ? 'application/octet-stream' : 'application/json')

    response.headers.set('content-type', responseContentType)
    setIpfsRoots(response, ipfsRoots)

    return response
  }
}
