import { peerIdFromCID, peerIdFromString } from '@libp2p/peer-id'
import { CID } from 'multiformats/cid'
import type { PeerId } from '@libp2p/interface'

export function getPeerIdFromString (peerIdString: string): PeerId {
  if (peerIdString.charAt(0) === '1' || peerIdString.charAt(0) === 'Q') {
    return peerIdFromString(peerIdString)
  }

  // try resolving as a base36 CID
  return peerIdFromCID(CID.parse(peerIdString))
}
