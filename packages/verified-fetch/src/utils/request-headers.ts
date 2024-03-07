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

/**
 * Given two ints from a Range header, and potential fileSize, returns:
 * 1. number of bytes the response should contain.
 * 2. the start index of the range. // inclusive
 * 3. the end index of the range. // inclusive
 */
export function calculateByteRangeIndexes (start: number | undefined, end: number | undefined, fileSize?: number): { byteSize?: number, start?: number, end?: number } {
  if (start != null && end != null) {
    if (start > end) {
      throw new Error('Invalid range')
    }

    return { byteSize: end - start + 1, start, end }
  } else if (start == null && end != null) {
    // suffix byte range requested
    if (fileSize == null) {
      return { end }
    }
    const result = { byteSize: end, start: fileSize - end, end: fileSize }
    return result
  } else if (start != null && end == null) {
    if (fileSize == null) {
      return { start }
    }
    const byteSize = fileSize - start + 1
    const end = fileSize
    return { byteSize, start, end }
  }

  // both start and end are undefined
  return { byteSize: fileSize }
}
