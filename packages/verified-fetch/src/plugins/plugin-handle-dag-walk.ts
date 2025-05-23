import { code as dagCborCode } from '@ipld/dag-cbor'
import { code as dagPbCode } from '@ipld/dag-pb'
import { handlePathWalking } from '../utils/walk-path.js'
import { BasePlugin } from './plugin-base.js'
import type { PluginContext } from './types.js'

/**
 * This plugin should almost always run first because it's going to handle path walking if needed, and will only say it can handle
 * the request if path walking is possible (path is not empty, terminalCid is unknown, and the path has not been walked yet).
 *
 * Once this plugin has run, the PluginContext will be updated and then this plugin will return false for canHandle, so it won't run again.
 */
export class DagWalkPlugin extends BasePlugin {
  readonly loggerName = 'dag-walk-plugin'
  /**
   * Return false if the path has already been walked, otherwise return true if the CID is encoded with a codec that supports pathing.
   */
  canHandle (context: PluginContext): boolean {
    this.log('checking if we can handle %c with accept %s', context.cid, context.accept)
    const { pathDetails, cid } = context
    if (pathDetails != null) {
      // path has already been walked
      return false
    }

    return (cid.code === dagPbCode || cid.code === dagCborCode)
  }

  async handle (context: PluginContext): Promise<Response | null> {
    const { cid, resource, options, withServerTiming = false } = context
    const { getBlockstore, handleServerTiming } = this.pluginOptions
    const blockstore = getBlockstore(cid, resource, options?.session ?? true, options)
    // TODO: migrate handlePathWalking into this plugin
    const pathDetails = await handleServerTiming('path-walking', '', async () => handlePathWalking({ ...context, blockstore, log: this.log }), withServerTiming)

    context.modified++
    if (pathDetails instanceof Response) {
      this.log.trace('path walking failed')

      if (pathDetails.status === 404) {
        // invalid or incorrect path.. we walked the path but nothing is there
        // send the 404 response
        return pathDetails
      }

      // some error walking the path
      return null
    }

    context.pathDetails = pathDetails

    return null
  }
}
