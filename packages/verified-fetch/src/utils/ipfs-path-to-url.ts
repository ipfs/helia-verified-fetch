import { InvalidParametersError } from '@libp2p/interface'

/**
 * Turns an IPFS or IPNS path into a HTTP URL. Path gateway syntax is used to
 * preserve any case sensitivity
 *
 * - `/ipfs/cid` -> `https://example.org/ipfs/cid`
 * - `/ipns/name` -> `https://example.org/ipns/name`
 */
export function ipfsPathToUrl (path: string): string {
  if (!path.startsWith('/ipfs/') && !path.startsWith('/ipns/')) {
    throw new InvalidParametersError(`Path ${path} did not start with /ipfs/ or /ipns/`)
  }

  // trim fragment
  const fragmentIndex = path.indexOf('#')
  let fragment = ''

  if (fragmentIndex > -1) {
    fragment = path.substring(fragmentIndex)
    path = path.substring(0, fragmentIndex)
  }

  // trim query
  const queryIndex = path.indexOf('?')
  let query = ''

  if (queryIndex > -1) {
    query = path.substring(queryIndex)
    path = path.substring(0, queryIndex)
  }

  const type = path.substring(1, 5)
  const rest = path.substring(6)

  return `https://example.org/${type}/${rest}${query}${fragment}`
}

/**
 * Turns an IPFS or IPNS URL into a HTTP URL. Path gateway syntax is used to
 * preserve and case sensitivity
 *
 * `ipfs://cid` -> `https://example.org/ipfs/cid`
 */
export function ipfsUrlToUrl (url: string): string {
  if (!url.startsWith('ipfs://') && !url.startsWith('ipns://')) {
    throw new InvalidParametersError(`URL ${url} did not start with ipfs:// or ipns://`)
  }

  const type = url.substring(0, 4)
  const rest = url.substring(7)

  return `https://example.org/${type}/${rest}`
}
