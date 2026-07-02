import { IPNSEntry } from '@helia/ipns'
import * as dagCbor from '@ipld/dag-cbor'
import { peerIdFromString } from '@libp2p/peer-id'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { CONTENT_TYPE_IPNS, MEDIA_TYPE_IPNS_RECORD } from '../utils/content-types.ts'
import { getContentDispositionFilename } from '../utils/get-content-disposition-filename.ts'
import { splitIPNSName } from '../utils/ipfs-path-to-cid.ts'
import { badRequestResponse, okResponse } from '../utils/responses.ts'
import { BasePlugin } from './plugin-base.ts'
import type { PluginContext } from '../index.ts'
import type { IPNSRecordData, IPNSResolveResult } from '@helia/ipns'
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

  async handle (context: Pick<PluginContext, 'resource' | 'url' | 'range' | 'redirected' | 'signal' | 'onProgress' | 'ttl' | 'expires'>): Promise<Response> {
    const { resource, url, range } = context
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

    let result: IPNSResolveResult | undefined

    for await (const res of ipnsResolver.resolve(peerId.toCID().multihash, context)) {
      result = res
    }

    if (result == null) {
      const err = new Error(`Could not resolve IPNS record for ${peerId}`)
      this.log.error('could not parse peer id from IPNS url %s', resource, err)

      return badRequestResponse(resource, err)
    }

    const block = IPNSEntry.encode(result.record)
    const data = dagCbor.decode<IPNSRecordData>(result.record.data ?? new Uint8Array(0))

    // 0 is EOL
    // @ts-expect-error TODO: remove TypeScript enums
    if (data.ValidityType === 0 && data.Validity instanceof Uint8Array) {
      const eol = new Date(uint8ArrayToString(data.Validity))

      context.expires = eol
      context.ttl = Math.round(Number((result.record.ttl ?? 0n) / BigInt(1e9)))
    }

    return okResponse(resource, block, {
      redirected: context.redirected,
      headers: {
        'content-length': `${block.byteLength}`,
        'content-type': CONTENT_TYPE_IPNS.mediaType,
        'content-disposition': `attachment; ${
          getContentDispositionFilename(url.searchParams.get('filename') ?? `${peerId}${CONTENT_TYPE_IPNS.extension}`)
        }`,
        'x-ipfs-roots': splitIPNSName(result.value).name,
        'accept-ranges': 'none'
      }
    })
  }
}
