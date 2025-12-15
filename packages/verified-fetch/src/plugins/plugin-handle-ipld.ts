import * as ipldDagCbor from '@ipld/dag-cbor'
import * as ipldDagJson from '@ipld/dag-json'
import * as dagPb from '@ipld/dag-pb'
import toBuffer from 'it-to-buffer'
import * as json from 'multiformats/codecs/json'
import * as raw from 'multiformats/codecs/raw'
import { identity } from 'multiformats/hashes/identity'
import { CODEC_CBOR } from '../constants.ts'
import { getContentTypesForCid, MEDIA_TYPE_CBOR, MEDIA_TYPE_DAG_CBOR, MEDIA_TYPE_DAG_JSON, MEDIA_TYPE_JSON, MEDIA_TYPE_OCTET_STREAM, MEDIA_TYPE_RAW } from '../utils/content-types.ts'
import { convertOutput } from '../utils/convert-output.ts'
import { getContentDispositionFilename } from '../utils/get-content-disposition-filename.ts'
import { notAcceptableResponse, okResponse, partialContentResponse } from '../utils/responses.js'
import { BasePlugin } from './plugin-base.js'
import type { ContentType, PluginContext } from '../index.ts'

/**
 * Handles loading JSON and CBOR content
 */
export class IpldPlugin extends BasePlugin {
  readonly id = 'ipld-plugin'
  readonly codes = [
    CODEC_CBOR,
    ipldDagCbor.code,
    ipldDagJson.code,
    json.code,
    raw.code,
    dagPb.code,
    identity.code
  ]

  canHandle ({ terminalElement, accept }: PluginContext): boolean {
    const supportsCid = this.codes.includes(terminalElement.cid.code)
    const supportsAccept = accept.length === 0 ||
      accept.some(header => header.contentType.mediaType === MEDIA_TYPE_CBOR ||
        header.contentType.mediaType === MEDIA_TYPE_DAG_CBOR ||
        header.contentType.mediaType === MEDIA_TYPE_JSON ||
        header.contentType.mediaType === MEDIA_TYPE_DAG_JSON ||
        header.contentType.mediaType === MEDIA_TYPE_RAW ||
        header.contentType.mediaType === MEDIA_TYPE_OCTET_STREAM
      )

    return supportsCid && supportsAccept
  }

  async handle (context: PluginContext): Promise<Response> {
    const { url, resource, accept, ipfsRoots, terminalElement, blockstore, options } = context

    this.log.trace('fetching %c/%s', terminalElement.cid, url.pathname)
    let block: Uint8Array
    if (terminalElement.node == null) {
      block = await toBuffer(blockstore.get(terminalElement.cid, options))
    } else if (terminalElement.type === 'object' || terminalElement.type === 'raw' || terminalElement.type === 'identity') {
      block = terminalElement.node
    } else {
      block = dagPb.encode(terminalElement.node)
    }

    let contentType: ContentType

    try {
      // maybe convert output to different binary format
      const result = convertOutput(terminalElement.cid, block, accept)
      block = result.output
      contentType = result.contentType
    } catch (err) {
      this.log.error('could not decode object from block - %e', err)
      return notAcceptableResponse(resource, getContentTypesForCid(terminalElement.cid))
    }

    const headers = {
      'content-length': `${block.byteLength}`,
      'content-type': contentType.mediaType,
      'content-disposition': `${url.searchParams.get('download') === 'true' ? 'attachment' : contentType.disposition}; ${
        getContentDispositionFilename(url.searchParams.get('filename') ?? `${terminalElement.cid}${contentType.extension}`)
      }`,
      'x-ipfs-roots': ipfsRoots.map(cid => cid.toV1()).join(','),
      'x-content-type-options': 'nosniff',
      'accept-ranges': 'bytes'
    }

    if (context.range != null) {
      return partialContentResponse(resource, async function * (offset, length) {
        yield block.subarray(offset, offset + length)
      }, context.range, block.byteLength, {
        headers
      })
    }

    return okResponse(resource, block, {
      headers
    })
  }
}
