import { InvalidParametersError } from '@libp2p/interface'
import { peerIdFromString } from '@libp2p/peer-id'
import { CID } from 'multiformats/cid'

/**
 * Turns an IPFS or IPNS path into a URL
 *
 * - `/ipfs/cid` -> `ipfs://cid`
 * - `/ipns/name` -> `ipns://name`
 */
function ipfsPathToIpfsUrl (path: string): string {
  if (!path.startsWith('/ipfs/') && !path.startsWith('/ipns/')) {
    throw new InvalidParametersError(`Path ${path} did not start with /ipfs/ or /ipns/`)
  }

  // use non-http protocol as otherwise an empty path will become "/"
  const url = new URL(`not-http://example.com${path}`)
  const [
    ,
    protocol,
    name,
    ...rest
  ] = url.pathname.split('/')

  return `${protocol}://${name}${rest.length > 0 ? `/${rest.join('/')}` : ''}${url.search}${url.hash}`
}

/**
 * Accepts the following url strings:
 *
 * - /ipfs/Qmfoo/path
 * - /ipns/Qmfoo/path
 * - ipfs://cid/path
 * - ipns://name/path
 */
export function stringToIpfsUrl (urlString: string): URL {
  if (urlString.startsWith('/ipfs/') || urlString.startsWith('/ipns/')) {
    urlString = ipfsPathToIpfsUrl(urlString)
  }

  if (urlString.startsWith('ipfs://') || urlString.startsWith('ipns://') || urlString.startsWith('dnslink://')) {
    const url = new URL(urlString)

    // ensure IPNS name can be parsed as a CID or peer id, otherwise treat as
    // dnslink
    if (url.protocol === 'ipns:') {
      try {
        CID.parse(url.hostname)
      } catch {
        try {
          peerIdFromString(url.hostname)
        } catch {
          url.protocol = 'dnslink'
        }
      }
    }

    return url
  }

  throw new InvalidParametersError(`URL did not start with ipfs:// or ipns:// - ${urlString}`)
}
