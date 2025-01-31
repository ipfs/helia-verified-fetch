import type { FetchHandlerPlugin, PluginContext, PluginOptions } from './types.js'
import type { Logger } from '@libp2p/interface'

export class BasePlugin implements FetchHandlerPlugin {
  readonly codes: number[] = []
  readonly log: Logger
  readonly pluginOptions: PluginOptions
  constructor (options: PluginOptions) {
    // convert a CamelCase string to a kebab-case string for the logger name of subclasses
    const loggerName = this.constructor.name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
    this.log = options.logger.forComponent(loggerName)
    this.pluginOptions = options
  }

  canHandle (context: PluginContext): boolean {
    this.log('checking if we can handle request for %c with accept %s', context.cid, context.accept)

    return false
  }

  async handle (context: PluginContext): Promise<Response | null> {
    throw new Error('Not implemented')
  }
}
