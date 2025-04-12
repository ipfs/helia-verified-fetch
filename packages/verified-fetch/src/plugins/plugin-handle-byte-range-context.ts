import { ByteRangeContext } from '../utils/byte-range-context.js'
import { badRangeResponse } from '../utils/responses.js'
import { BasePlugin } from './plugin-base.js'
import type { PluginContext } from './types.js'

/**
 * This plugin simply adds the ByteRangeContext to the PluginContext.
 */
export class ByteRangeContextPlugin extends BasePlugin {
  /**
   * Return false if the ByteRangeContext has already been set, otherwise return true.
   */
  canHandle (context: PluginContext): boolean {
    return context.byteRangeContext == null
  }

  async handle (context: PluginContext): Promise<Response | null> {
    context.byteRangeContext = new ByteRangeContext(this.pluginOptions.logger, context.options?.headers)
    context.modified++

    if (context.byteRangeContext.isRangeRequest && !context.byteRangeContext.isValidRangeRequest) {
      // invalid range request.. fail
      return badRangeResponse(context.resource)
    }

    return null
  }
}
