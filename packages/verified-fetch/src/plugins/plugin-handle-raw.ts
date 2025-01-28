import { code as rawCode } from 'multiformats/codecs/raw'
import { identity } from 'multiformats/hashes/identity'
import { PluginError } from '../errors.js'
import { ByteRangeContext } from '../utils/byte-range-context.js'
// import { notFoundResponse, okRangeResponse } from '../utils/responses.js'
import { okRangeResponse } from '../utils/responses.js'
import { setContentType } from '../utils/set-content-type.js'
import type { FetchHandlerPlugin, PluginContext, PluginOptions } from './types.js'

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

export class RawPlugin implements FetchHandlerPlugin {
  canHandle ({ accept, cid }: PluginContext, pluginOptions: PluginOptions): boolean {
    const isValidRawCode = cid.code === rawCode || cid.code === identity.code
    if (accept === undefined) {
      return isValidRawCode
    }
    // if (accept === 'application/x-tar') {
    //   // conflict with tar requests.. need to ensure TarPlugin handles those.
    //   // TODO: we shouldn't need to "DenyList" other plugins that may handle things, but instead have a way to prioritize or fallback to other plugins.
    //   return false
    // }

    return accept === 'application/vnd.ipld.raw' || isValidRawCode
  }

  async handle (context: PluginContext, pluginOptions: PluginOptions): Promise<Response> {
    const { path, resource, cid, accept } = context
    const { options, getBlockstore, logger, contentTypeParser } = pluginOptions
    const session = options?.session ?? true
    const log = logger.forComponent('raw-plugin')

    if (accept === 'application/vnd.ipld.raw') {
      context.reqFormat = 'raw'
      context.query.download = true
      context.query.filename = context.query.filename ?? `${cid.toString()}.bin`
    }

    if (path !== '') {
      log.trace('404-ing raw codec request for %c/%s', cid, path)
      throw new PluginError('ERR_RAW_PATHS_NOT_SUPPORTED', 'Raw codec does not support paths')
      // return notFoundResponse(resource, 'Raw codec does not support paths')
    }

    const byteRangeContext = new ByteRangeContext(logger, options?.headers)
    const blockstore = getBlockstore(cid, resource, session, options)
    const result = await blockstore.get(cid, options)
    byteRangeContext.setBody(result)
    const response = okRangeResponse(resource, byteRangeContext.getBody(), { byteRangeContext, log }, {
      redirected: false
    })

    // if the user has specified an `Accept` header that corresponds to a raw
    // type, honour that header, so for example they don't request
    // `application/vnd.ipld.raw` but get `application/octet-stream`
    await setContentType({ bytes: result, path, response, defaultContentType: getOverridenRawContentType({ headers: options?.headers, accept }), contentTypeParser, log })

    return response
  }
}
