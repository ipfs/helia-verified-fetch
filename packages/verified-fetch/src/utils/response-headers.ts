/**
 * This function returns the value of the `Content-Range` header for a given range.
 * If you know the total size of the body, pass it as `byteSize`
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Range
 */
export function getContentRangeHeader ({ byteStart, byteEnd, byteSize }: { byteStart: number | undefined, byteEnd: number | undefined, byteSize: number | undefined }): string {
  const total = byteSize ?? '*' // if we don't know the total size, we should use *

  if ((byteEnd ?? 0) >= (byteSize ?? Infinity)) {
    throw new Error('Invalid range: Range-end index is greater than or equal to the size of the file.')
  }
  if ((byteStart ?? 0) >= (byteSize ?? Infinity)) {
    throw new Error('Invalid range: Range-start index is greater than or equal to the size of the file.')
  }

  if (byteStart != null && byteEnd == null) {
    // only byteStart in range
    if (byteSize == null) {
      return `bytes */${total}`
    }
    return `bytes ${byteStart}-${byteSize - 1}/${byteSize}`
  }

  if (byteStart == null && byteEnd != null) {
    // only byteEnd in range
    if (byteSize == null) {
      return `bytes */${total}`
    }
    const end = byteSize - 1
    const start = end - byteEnd + 1

    return `bytes ${start}-${end}/${byteSize}`
  }

  if (byteStart == null && byteEnd == null) {
    // neither are provided, we can't return a valid range.
    return `bytes */${total}`
  }

  return `bytes ${byteStart}-${byteEnd}/${total}`
}
