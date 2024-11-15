import { peerIdFromCID, peerIdFromString as libp2pPeerIdFromString } from '@libp2p/peer-id'
import { CID } from 'multiformats/cid'
import type { Logger, PeerId } from '@libp2p/interface'

export function peerIdFromString (peerIdStr: string, log?: Logger): PeerId {
  let peerId: PeerId
  if (peerIdStr.charAt(0) === '1' || peerIdStr.charAt(0) === 'Q') {
    peerId = libp2pPeerIdFromString(peerIdStr)
  } else { // if (peerIdStr.startsWith('k')) {
    /**
     * libp2p CID peerID
     *
     * @see https://github.com/libp2p/js-libp2p/blob/2feaeddb40712a5d58aee158021a10b9b9bbf660/doc/migrations/v1.0.0-v2.0.0.md?plain=1#L255
     */
    let cid: CID
    try {
      cid = CID.parse(peerIdStr)
    } catch (err: any) {
      log?.error('Could not parse CID from string "%s"', peerIdStr, err)
      throw new Error(`Could not parse CID from string: ${peerIdStr}`)
    }
    peerId = peerIdFromCID(cid)
  }

  return peerId
}
