import type { VerifiedFetchPlugin, PluginContext, PluginOptions } from '../index.js'
import type { Logger } from '@libp2p/interface'

/**
 * Base class for verified-fetch plugins. This class provides a basic
 * implementation of the `VerifiedFetchPlugin` interface.
 *
 * Subclasses must implement the `id` property, the `canHandle`, and `handle`
 * methods.
 *
 * Subclasses may override the `codes` and `log` properties.
 */
export abstract class BasePlugin implements VerifiedFetchPlugin {
  readonly pluginOptions: PluginOptions
  protected _log?: Logger

  get log (): Logger {
    // instantiate the logger lazily because it depends on the id, which is not
    // set until after the constructor is called
    if (this._log == null) {
      this._log = this.pluginOptions.logger.newScope(this.id)
    }
    return this._log
  }

  constructor (options: PluginOptions) {
    this.pluginOptions = options
  }

  abstract readonly id: string
  abstract canHandle (context: PluginContext): boolean
  abstract handle (context: PluginContext): Promise<Response>
}
