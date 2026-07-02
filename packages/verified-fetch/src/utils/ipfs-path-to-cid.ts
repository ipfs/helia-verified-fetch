export function splitIPNSName (path: string): { ns: string, name: string, path: string } {
  const [, ns, name, ...rest] = path.trim().split('/')

  return {
    ns,
    name,
    path: rest.length > 0 ? `${rest.join('/')}` : ''
  }
}
