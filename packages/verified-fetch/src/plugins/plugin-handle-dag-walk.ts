import * as dagCbor from '@ipld/dag-cbor'
import * as dagJson from '@ipld/dag-json'
import * as dagPb from '@ipld/dag-pb'
import toBuffer from 'it-to-buffer'
import * as json from 'multiformats/codecs/json'
import * as raw from 'multiformats/codecs/raw'
import { CODEC_CBOR, CODEC_IDENTITY } from '../constants.ts'
import { handlePathWalking } from '../utils/walk-path.js'
import { BasePlugin } from './plugin-base.js'
import type { PluginContext } from './types.js'
import type { PathWalkerResponse } from '../utils/walk-path.js'

const ENTITY_CODECS = [
  CODEC_CBOR,
  json.code,
  raw.code
]

const WALKABLE_CODECS = [
  dagPb.code,
  dagCbor.code,
  dagJson.code,
  ...ENTITY_CODECS
]

/**
 * This plugin should almost always run first because it's going to handle path
 * walking if needed, and will only say it can handle the request if path
 * walking is possible (path is not empty, terminalCid is unknown, and the path
 * has not been walked yet).
 *
 * Once this plugin has run, the PluginContext will be updated and then this
 * plugin will return false for canHandle, so it won't run again.
 */
export class DagWalkPlugin extends BasePlugin {
  readonly id = 'dag-walk-plugin'

  /**
   * Return false if the path has already been walked, otherwise return true if
   * the CID is encoded with a codec that supports pathing.
   */
  canHandle (context: PluginContext): boolean {
    const { pathDetails, cid } = context

    if (pathDetails != null) {
      // path has already been walked
      return false
    }

    return WALKABLE_CODECS.includes(cid.code)
  }

  async handle (context: PluginContext): Promise<Response | null> {
    const { cid, resource, options } = context
    const { getBlockstore } = this.pluginOptions
    const blockstore = getBlockstore(cid, resource, options?.session ?? true, options)

    let pathDetails: PathWalkerResponse | Response

    // entity codecs contain all the bytes for an entity in one block and no
    // path walking outside of that block is possible
    if (ENTITY_CODECS.includes(cid.code)) {
      let bytes: Uint8Array

      if (cid.multihash.code === CODEC_IDENTITY) {
        bytes = cid.multihash.digest
      } else {
        bytes = await toBuffer(blockstore.get(cid, context.options))
      }

      pathDetails = {
        ipfsRoots: [cid],
        terminalElement: {
          name: cid.toString(),
          path: cid.toString(),
          depth: 0,
          type: 'object',
          node: bytes,
          cid,
          size: BigInt(bytes.byteLength),
          content: async function * () {
            yield bytes
          }
        }
      }
    } else {
      // TODO: migrate handlePathWalking into this plugin
      pathDetails = await context.serverTiming.time('path-walking', '', handlePathWalking({ ...context, blockstore, log: this.log }))
    }

    if (pathDetails instanceof Response) {
      this.log.trace('path walking failed')

      if (pathDetails.status === 404) {
        // invalid or incorrect path.. we walked the path but nothing is there
        // send the 404 response
        return pathDetails
      }

      // some other error walking the path (codec doesn't support pathing,
      // etc..), let the next plugin try to handle it
      return null
    }

    context.modified++
    context.pathDetails = pathDetails

    return null
  }
}
