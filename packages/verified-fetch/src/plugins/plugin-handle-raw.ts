import { code as rawCode } from 'multiformats/codecs/raw'
import { identity } from 'multiformats/hashes/identity'
import { notFoundResponse, okRangeResponse } from '../utils/responses.js'
import { setContentType } from '../utils/set-content-type.js'
import { PluginFatalError } from './errors.js'
import { BasePlugin } from './plugin-base.js'
import type { PluginContext } from './types.js'

/**
 * These are Accept header values that will cause content type sniffing to be
 * skipped and set to these values.
 */
const RAW_HEADERS = [
  'application/vnd.ipld.dag-json',
  'application/vnd.ipld.raw',
  'application/octet-stream'
]

/**
 * if the user has specified an `Accept` header, and it's in our list of
 * allowable "raw" format headers, use that instead of detecting the content
 * type. This avoids the user from receiving something different when they
 * signal that they want to `Accept` a specific mime type.
 */
function getOverridenRawContentType ({ headers, accept }: { headers?: HeadersInit, accept?: string }): string | undefined {
  // accept has already been resolved by getResolvedAcceptHeader, if we have it, use it.
  const acceptHeader = accept ?? new Headers(headers).get('accept') ?? ''

  // e.g. "Accept: text/html, application/xhtml+xml, application/xml;q=0.9, image/webp, */*;q=0.8"
  const acceptHeaders = acceptHeader.split(',')
    .map(s => s.split(';')[0])
    .map(s => s.trim())

  for (const mimeType of acceptHeaders) {
    if (mimeType === '*/*') {
      return
    }

    if (RAW_HEADERS.includes(mimeType ?? '')) {
      return mimeType
    }
  }
}

export class RawPlugin extends BasePlugin {
  codes: number[] = [rawCode, identity.code]

  canHandle ({ cid, accept, query, byteRangeContext }: PluginContext): boolean {
    this.log('checking if we can handle %c with accept %s', cid, accept)
    if (byteRangeContext == null) {
      return false
    }
    return accept === 'application/vnd.ipld.raw' || query.format === 'raw'
  }

  async handle (context: PluginContext & Required<Pick<PluginContext, 'byteRangeContext'>>): Promise<Response> {
    const { path, resource, cid, accept, query, options } = context
    const { getBlockstore, contentTypeParser } = this.pluginOptions
    const session = options?.session ?? true
    const log = this.log

    if (accept === 'application/vnd.ipld.raw' || query.format === 'raw') {
      context.reqFormat = 'raw'
      context.query.download = true
      context.query.filename = context.query.filename ?? `${cid.toString()}.bin`
      log.trace('Set content disposition...')
    } else {
      log.trace('Did NOT set content disposition...')
    }

    if (path !== '' && cid.code === rawCode) {
      log.trace('404-ing raw codec request for %c/%s', cid, path)
      // throw new PluginError('ERR_RAW_PATHS_NOT_SUPPORTED', 'Raw codec does not support paths')
      // return notFoundResponse(resource, 'Raw codec does not support paths')
      throw new PluginFatalError('ERR_RAW_PATHS_NOT_SUPPORTED', 'Raw codec does not support paths', { response: notFoundResponse(resource, 'Raw codec does not support paths') })
    }

    const terminalCid = context.pathDetails?.terminalElement.cid ?? context.cid
    const blockstore = getBlockstore(terminalCid, resource, session, options)
    const result = await blockstore.get(terminalCid, options)
    context.byteRangeContext.setBody(result)
    const response = okRangeResponse(resource, context.byteRangeContext.getBody(), { byteRangeContext: context.byteRangeContext, log }, {
      redirected: false
    })

    // if the user has specified an `Accept` header that corresponds to a raw
    // type, honour that header, so for example they don't request
    // `application/vnd.ipld.raw` but get `application/octet-stream`
    await setContentType({ bytes: result, path, response, defaultContentType: getOverridenRawContentType({ headers: options?.headers, accept }), contentTypeParser, log })

    return response
  }
}
