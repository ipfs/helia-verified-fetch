import { code as dagPbCode } from '@ipld/dag-pb'
import { base32 } from 'multiformats/bases/base32'
import { sha256 } from 'multiformats/hashes/sha2'
import { dirIndexHtml } from '../utils/dir-index-html.js'
import { getETag } from '../utils/get-e-tag.js'
import { getIpfsRoots } from '../utils/response-headers.js'
import { okRangeResponse } from '../utils/responses.js'
import { BasePlugin } from './plugin-base.js'
import type { PluginContext, VerifiedFetchPluginFactory } from './types.js'
import type { UnixFSEntry } from 'ipfs-unixfs-exporter'

/**
 * Converts a list of directory entries into a small hash that can be used in the etag header.
 *
 * @see https://github.com/ipfs/boxo/blob/dc60fe747c375c631a92fcfd6c7456f44a760d24/gateway/assets/assets.go#L84
 * @see https://github.com/ipfs/boxo/blob/dc60fe747c375c631a92fcfd6c7456f44a760d24/gateway/handler_unixfs_dir.go#L233-L235
 */
async function getAssetHash (directoryEntries: UnixFSEntry[]): Promise<string> {
  const entryDetails = directoryEntries.reduce((acc, entry) => {
    return `${acc}${entry.name}${entry.cid.toString()}`
  }, '')
  const hashBytes = await sha256.encode(new TextEncoder().encode(entryDetails))
  return base32.encode(hashBytes)
}

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

    const { terminalElement, ipfsRoots } = pathDetails

    const gatewayURL = resource
    const htmlResponse = dirIndexHtml(terminalElement, directoryEntries, { gatewayURL, log: this.log })

    context.byteRangeContext.setBody(htmlResponse)

    const etagPrefix = `DirIndex-${await getAssetHash(directoryEntries)}_CID-`

    const response = okRangeResponse(resource, context.byteRangeContext.getBody(), { byteRangeContext: context.byteRangeContext, log: this.log }, {
      headers: {
        'Content-Type': 'text/html',
        // see https://github.com/ipfs/gateway-conformance/pull/219
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=2678400',
        'X-Ipfs-Roots': getIpfsRoots(ipfsRoots),
        // e.g. DirIndex-<asset_hash>_CID-<cid>
        Etag: getETag({ cid: terminalElement.cid, reqFormat: context.reqFormat, contentPrefix: etagPrefix })
      }
    })

    return response
  }
}

export const dirIndexHtmlPluginFactory: VerifiedFetchPluginFactory = (opts) => new DirIndexHtmlPlugin(opts)
