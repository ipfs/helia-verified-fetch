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
export class BasePlugin implements Omit<VerifiedFetchPlugin, 'id'> {
  readonly codes: number[] = []
  readonly log: Logger
  readonly pluginOptions: PluginOptions
  readonly id?: string // should be overridden by subclasses
  constructor (options: PluginOptions) {
    // convert a CamelCase string to a kebab-case string for the logger name of subclasses
    const loggerName = this.id ?? this.constructor.name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
    this.log = options.logger.forComponent(loggerName)
    this.pluginOptions = options
  }

  canHandle (context: PluginContext): boolean {
    throw new Error('Not implemented')
  }

  async handle (context: PluginContext): Promise<Response | null> {
    throw new Error('Not implemented')
  }
}
