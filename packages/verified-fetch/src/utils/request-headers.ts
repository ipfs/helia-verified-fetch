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
      throw new Error('Invalid range: Range-start index is greater than range-end index.')
    }
    if (end >= (fileSize ?? Infinity)) {
      throw new Error('Invalid range: Range-end index is greater than or equal to the size of the file.')
    }

    return { byteSize: end - start + 1, start, end }
  } else if (start == null && end != null) {
    // suffix byte range requested
    if (fileSize == null) {
      return { end }
    }
    if (end > fileSize) {
      throw new Error('Invalid range: Range-end index is greater than the size of the file.')
    }
    if (end === fileSize) {
      return { byteSize: fileSize, start: 0, end: fileSize - 1 }
    }
    const result = { byteSize: end, start: fileSize - end + 1, end: fileSize - 1 }
    return result
  } else if (start != null && end == null) {
    if (fileSize == null) {
      // we only have the start index, and no fileSize, so we can't return a valid range.
      return { start }
    }
    const end = fileSize - 1
    const byteSize = fileSize - start
    return { byteSize, start, end }
  }

  // both start and end are undefined
  return { byteSize: fileSize }
}
