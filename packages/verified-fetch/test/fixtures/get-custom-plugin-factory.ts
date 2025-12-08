import { BasePlugin } from '../../src/plugins/plugin-base.js'
import type { PluginContext, PluginOptions, VerifiedFetchPluginFactory } from '../../src/index.js'

export interface PluginFixtureOptions {
  codes?: number[]
  constructorName?: string
  id?: string
  canHandle?(context: PluginContext): boolean
  handle?(context: PluginContext): Promise<Response>
}

export const getCustomPluginFactory = (options: PluginFixtureOptions): VerifiedFetchPluginFactory => {
  const className = options.constructorName ?? 'CustomPlugin'

  const classes = {
    [className]: class extends BasePlugin {
      id = options.id ?? options.constructorName?.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase() ?? 'custom-plugin'
      codes = options.codes ?? []

      canHandle (context: PluginContext): boolean {
        return options.canHandle != null ? options.canHandle(context) : false
      }

      async handle (context: PluginContext): Promise<Response> {
        if (options.handle != null) {
          return options.handle(context)
        } else {
          throw new Error('Not implemented')
        }
      }
    }
  }

  const CustomPlugin = classes[className]

  return (pluginOptions: PluginOptions) => new CustomPlugin(pluginOptions)
}
