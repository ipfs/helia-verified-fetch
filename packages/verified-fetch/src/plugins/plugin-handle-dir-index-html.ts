import { code as dagPbCode } from '@ipld/dag-pb'
import { dirIndexHtml } from '../utils/dir-index-html.js'
import { okRangeResponse } from '../utils/responses.js'
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

  async handle (context: PluginContext & Required<Pick<PluginContext, 'byteRangeContext' | 'pathDetails' | 'directoryEntries'>>): Promise<Response> {
    const { resource, pathDetails, directoryEntries } = context

    const terminalElement = pathDetails.terminalElement

    const gatewayURL = resource
    const htmlResponse = dirIndexHtml(terminalElement, directoryEntries, { gatewayURL, log: this.log })

    context.byteRangeContext.setBody(htmlResponse)

    const response = okRangeResponse(resource, context.byteRangeContext.getBody('text/html'), { byteRangeContext: context.byteRangeContext, log: this.log })

    response.headers.set('Content-Type', context.byteRangeContext.getContentType() ?? 'text/html')
    // see https://github.com/ipfs/gateway-conformance/pull/219
    response.headers.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=2678400')

    return response
  }
}

export const dirIndexHtmlPluginFactory: VerifiedFetchPluginFactory = (opts) => new DirIndexHtmlPlugin(opts)
