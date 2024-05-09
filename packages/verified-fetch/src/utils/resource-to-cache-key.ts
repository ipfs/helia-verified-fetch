import { CID } from 'multiformats/cid'
import { matchURLString } from './parse-url-string.js'

/**
 * Takes a resource and returns a session cache key as an IPFS or IPNS path with
 * any trailing segments removed.
 *
 * E.g.
 *
 * - Qmfoo -> /ipfs/Qmfoo
 * - https://Qmfoo.ipfs.gateway.org -> /ipfs/Qmfoo
 * - https://gateway.org/ipfs/Qmfoo -> /ipfs/Qmfoo
 * - https://gateway.org/ipfs/Qmfoo/bar.txt -> /ipfs/Qmfoo
 * - etc
 */
export function resourceToSessionCacheKey (url: string | CID): string {
  const cid = CID.asCID(url)

  if (cid != null) {
    return `ipfs://${cid}`
  }

  try {
    return `ipfs://${CID.parse(url.toString())}`
  } catch {}

  const { protocol, cidOrPeerIdOrDnsLink } = matchURLString(url.toString())

  return `${protocol}://${cidOrPeerIdOrDnsLink}`
}
