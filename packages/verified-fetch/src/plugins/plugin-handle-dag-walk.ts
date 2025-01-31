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
  /**
   * Return false if the path has already been walked, otherwise return true.
   */
  canHandle ({ pathDetails, cid, path }: PluginContext): boolean {
    this.log('checking if the path needs walked')
    if (pathDetails != null) {
      // path has already been walked
      return false
    }

    // if (path === '') {
    //   // no path to walk
    //   return false
    // }

    return (cid.code === dagPbCode || cid.code === dagCborCode)
  }

  /**
   * We need to walk the path, so
   */
  async handle (context: PluginContext): Promise<Response | null> {
    const { cid, resource, options, withServerTiming = false } = context
    const { getBlockstore, handleServerTiming } = this.pluginOptions
    // const blockstore = context.blockstore ?? getBlockstore(cid, resource, options?.session ?? true, options)
    const blockstore = getBlockstore(cid, resource, options?.session ?? true, options)
    const pathDetails = await handleServerTiming('path-walking', '', async () => handlePathWalking({ ...context, blockstore, log: this.log }), withServerTiming)

    if (pathDetails instanceof Response) {
      return pathDetails
    }

    context.pathDetails = pathDetails
    context.modified++
    // context.blockstore = blockstore

    return null
  }
}
