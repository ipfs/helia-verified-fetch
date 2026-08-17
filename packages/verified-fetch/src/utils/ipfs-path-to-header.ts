/**
 * Joins an array of strings as an IPFS path and URI encodes individual
 * components.
 *
 * Headers can ony contain extended ASCII but IPFS paths can be unicode.
 */
export function ipfsPathToHeaderValue (protocol: string, hostname: string, path: string): string {
  // headers can ony contain extended ASCII but IPFS paths can be unicode
  let decodedPath = path
    .split('/')
    .map(component => decodeURIComponent(component))
    .join('/')
    .trim()
    .split('')
    .map(s => {
      if (s.charCodeAt(0) > 255) {
        return encodeURIComponent(s)
      }

      return s
    })
    .join('')

  if (decodedPath.length > 0 && !decodedPath.startsWith('/')) {
    decodedPath = `/${decodedPath}`
  }

  if (decodedPath === '/') {
    decodedPath = ''
  }

  return `/${protocol === 'ipfs:' ? 'ipfs' : 'ipns'}/${hostname}${decodedPath}`
}
