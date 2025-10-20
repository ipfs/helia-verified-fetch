/**
 * Joins an array of strings as an IPFS path and URI encodes individual
 * components
 */
export function uriEncodeIPFSPath (str: string): string {
  return str.split('/')
    .map(p => encodeURIComponent(p))
    .join('/')
}
