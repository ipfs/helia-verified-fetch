export function getHeader (headers: HeadersInit | undefined, header: string): string | undefined {
  if (headers == null) {
    return undefined
  }
  if (headers instanceof Headers) {
    return headers.get(header) ?? undefined
  }
  if (Array.isArray(headers)) {
    const entry = headers.find(([key]) => key.toLowerCase() === header.toLowerCase())
    return entry?.[1]
  }
  const key = Object.keys(headers).find(k => k.toLowerCase() === header.toLowerCase())
  if (key == null) {
    return undefined
  }

  return headers[key]
}
