import type { VerifiedFetchPlugin, PluginContext, PluginOptions } from './types.js'
import type { Logger } from '@libp2p/interface'

/**
 * Base class for verified-fetch plugins. This class provides a basic implementation of the `FetchHandlerPlugin`
 * interface.
 *
 * Subclasses should implement the `canHandle` and `handle` methods and should set a unique `id` property.
 * Subclasses may override the `codes` and `log` properties.
 *
 * If your plugin adds/edits the context supplied in `handle`, you should increment the `context.modified` property.
 */
export class BasePlugin implements VerifiedFetchPlugin {
  readonly codes: number[] = []
  readonly log: Logger
  readonly pluginOptions: PluginOptions
  // @ts-expect-error - id is not initialized in the constructor for BasePlugin
  readonly id: string // should be overridden by subclasses
  constructor (options: PluginOptions) {
    // @ts-expect-error - id is not initialized in the constructor for BasePlugin
    this.log = options.logger.forComponent(this.id)
    this.pluginOptions = options
  }

  canHandle (context: PluginContext): boolean {
    throw new Error('Not implemented')
  }

  async handle (context: PluginContext): Promise<Response | null> {
    throw new Error('Not implemented')
  }
}
