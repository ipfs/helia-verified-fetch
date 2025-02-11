import { code as dagPbCode } from '@ipld/dag-pb'
import { dirIndexHtml } from '../utils/dir-index-html.js'
import { okResponse } from '../utils/responses.js'
import { BasePlugin } from './plugin-base.js'
import type { PluginContext, VerifiedFetchPluginFactory } from './types.js'

export class DirIndexHtmlPlugin extends BasePlugin {
  readonly codes = [dagPbCode]
  canHandle (context: PluginContext): boolean {
    const { cid, pathDetails, directoryEntries } = context
    if (pathDetails == null) {
      return false
    }
    if (pathDetails.terminalElement?.type !== 'directory') {
      return false
    }

    if (directoryEntries?.length === 0) {
      return false
    }

    return cid.code === dagPbCode
  }

  async handle (context: PluginContext): Promise<Response> {
    const { resource, pathDetails, directoryEntries } = context

    if (pathDetails?.terminalElement == null) {
      throw new Error('Path details are required')
    }
    if (directoryEntries == null || directoryEntries?.length === 0) {
      throw new Error('Directory entries are required')
    }
    const terminalElement = pathDetails.terminalElement

    const gatewayURL = resource
    const htmlResponse = dirIndexHtml(terminalElement, directoryEntries, { gatewayURL, log: this.log })
    const response = okResponse(resource, htmlResponse)
    response.headers.set('content-type', 'text/html')
    return response
  }
}

export const dirIndexHtmlPluginFactory: VerifiedFetchPluginFactory = (opts) => new DirIndexHtmlPlugin(opts)
