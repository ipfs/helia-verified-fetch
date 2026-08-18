/**
 * Turns an IPFS URL to an IPFS Path
 */
export function toIPFSPath (url: URL): string {
  let pathname = url.pathname.split('/')
    .map(component => decodeURIComponent(component))
    .join('/')

  if (pathname.length > 0 && !pathname.startsWith('/')) {
    pathname = `/${pathname}`
  }

  if (pathname === '/') {
    pathname = ''
  }

  return `/${url.protocol === 'ipfs:' ? 'ipfs' : 'ipns'}/${url.hostname}${pathname}`
}
