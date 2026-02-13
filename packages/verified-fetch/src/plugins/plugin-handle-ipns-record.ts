import { peerIdFromString } from '@libp2p/peer-id'
import { marshalIPNSRecord } from 'ipns'
import { CONTENT_TYPE_IPNS, MEDIA_TYPE_IPNS_RECORD } from '../utils/content-types.ts'
import { getContentDispositionFilename } from '../utils/get-content-disposition-filename.ts'
import { badRequestResponse, okResponse } from '../utils/responses.js'
import { BasePlugin } from './plugin-base.js'
import type { PluginContext } from '../index.js'
import type { PeerId } from '@libp2p/interface'

/**
 * Accepts an `ipns://...`, `https?://<ipnsname>.ipns.<domain>`, or `https?://<domain>/ipns/...` URL as a string and
 * returns a `Response` containing a raw IPNS record.
 */
export class IpnsRecordPlugin extends BasePlugin {
  readonly id = 'ipns-record-plugin'
  readonly codes = []

  canHandle ({ accept }: PluginContext): boolean {
    return accept.some(header => header.contentType.mediaType === MEDIA_TYPE_IPNS_RECORD)
  }

  async handle (context: Pick<PluginContext, 'resource' | 'url' | 'options' | 'range' | 'redirected'>): Promise<Response> {
    const { resource, url, options, range } = context
    const { ipnsResolver } = this.pluginOptions

    if ((url.pathname !== '' && url.pathname !== '/') || url.protocol !== 'ipns:') {
      this.log.error('invalid request for IPNS name "%s" and path "%s"', url, url.pathname)
      return badRequestResponse(resource, new Error('Invalid IPNS name'))
    }

    if (range != null) {
      return badRequestResponse(resource, new Error('Range requests are not supported for IPNS records'))
    }

    let peerId: PeerId

    try {
      this.log.trace('trying to parse peer id from "%s"', url.hostname)
      peerId = peerIdFromString(url.hostname)
    } catch (err: any) {
      this.log.error('could not parse peer id from IPNS url %s', resource, err)

      return badRequestResponse(resource, err)
    }

    const result = await ipnsResolver.resolve(peerId, options)
    const block = marshalIPNSRecord(result.record)

    return okResponse(resource, block, {
      redirected: context.redirected,
      headers: {
        'content-length': `${block.byteLength}`,
        'content-type': CONTENT_TYPE_IPNS.mediaType,
        'content-disposition': `attachment; ${
          getContentDispositionFilename(url.searchParams.get('filename') ?? `${peerId}${CONTENT_TYPE_IPNS.extension}`)
        }`,
        'x-ipfs-roots': result.cid.toV1().toString(),
        'cache-control': `public, max-age=${Number((result.record.ttl ?? 0n) / BigInt(1e9))}`,
        'accept-ranges': 'none'
      }
    })
  }
}
