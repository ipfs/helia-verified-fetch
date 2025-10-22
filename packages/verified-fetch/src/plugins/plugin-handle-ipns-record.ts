import { marshalIPNSRecord } from 'ipns'
import { getPeerIdFromString } from '../utils/get-peer-id-from-string.js'
import { badRequestResponse, okRangeResponse } from '../utils/responses.js'
import { PluginFatalError } from './errors.js'
import { BasePlugin } from './plugin-base.js'
import type { PluginContext } from './types.js'
import type { PeerId } from '@libp2p/interface'

/**
 * Accepts an `ipns://...`, `https?://<ipnsname>.ipns.<domain>`, or `https?://<domain>/ipns/...` URL as a string and
 * returns a `Response` containing a raw IPNS record.
 */
export class IpnsRecordPlugin extends BasePlugin {
  readonly id = 'ipns-record-plugin'
  readonly codes = []
  canHandle ({ cid, accept, query, byteRangeContext }: PluginContext): boolean {
    this.log('checking if we can handle %c with accept %s', cid, accept)
    if (byteRangeContext == null) {
      return false
    }

    return accept?.mimeType === 'application/vnd.ipfs.ipns-record' || query.format === 'ipns-record'
  }

  async handle (context: PluginContext & Required<Pick<PluginContext, 'byteRangeContext'>>): Promise<Response> {
    const { resource, path, query, options } = context
    const { ipnsResolver } = this.pluginOptions
    context.reqFormat = 'ipns-record'

    if (path !== '' || !(resource.startsWith('ipns://') || resource.includes('.ipns.') || resource.includes('/ipns/'))) {
      this.log.error('invalid request for IPNS name "%s" and path "%s"', resource, path)
      throw new PluginFatalError('ERR_INVALID_IPNS_NAME', 'Invalid IPNS name', { response: badRequestResponse(resource, new Error('Invalid IPNS name')) })
    }

    let peerId: PeerId

    try {
      let peerIdString: string
      if (resource.startsWith('ipns://')) {
        peerIdString = resource.replace('ipns://', '')
      } else if (resource.includes('/ipns/')) {
        peerIdString = resource.split('/ipns/')[1].split('/')[0].split('?')[0]
      } else {
        peerIdString = resource.split('.ipns.')[0].split('://')[1]
      }

      this.log.trace('trying to parse peer id from "%s"', peerIdString)
      peerId = getPeerIdFromString(peerIdString)
    } catch (err: any) {
      this.log.error('could not parse peer id from IPNS url %s', resource, err)

      throw new PluginFatalError('ERR_NO_PEER_ID_FOUND', 'could not parse peer id from url', { response: badRequestResponse(resource, err) })
    }

    // force download in handleFinalResponse
    query.filename = query.filename ?? `${peerId}.bin`
    query.download = true

    // @ts-expect-error progress handler types are incompatible
    const result = await ipnsResolver.resolve(peerId, options)
    const buf = marshalIPNSRecord(result.record)

    context.byteRangeContext.setBody(buf)

    const response = okRangeResponse(resource, context.byteRangeContext.getBody('application/vnd.ipfs.ipns-record'), { byteRangeContext: context.byteRangeContext, log: this.log })
    response.headers.set('content-type', context.byteRangeContext.getContentType() ?? 'application/vnd.ipfs.ipns-record')
    response.headers.set('content-length', buf.byteLength.toString())
    response.headers.set('x-ipfs-roots', result.cid.toV1().toString())

    return response
  }
}
