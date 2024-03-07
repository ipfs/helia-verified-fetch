/**
 * This function returns the value of the `Content-Range` header for a given range.
 * If you know the total size of the body, you should pass it in the `options` object.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Range
 */
export function getContentRangeHeader ({ byteStart, byteEnd, byteSize }: { byteStart: number | undefined, byteEnd: number | undefined, byteSize: number | undefined }): string {
  const total = byteSize ?? '*' // if we don't know the total size, we should use *

  if (byteStart == null && byteEnd == null) {
    return `bytes */${total}`
  }
  if (byteStart != null && byteEnd == null) {
    return `bytes ${byteStart}-*/${total}`
  }
  if (byteStart == null && byteEnd != null) {
    if (byteSize == null) {
      return `bytes */${total}`
    }
    return `bytes ${byteSize - byteEnd + 1}-${byteSize}/${byteSize}`
  }

  return `bytes ${byteStart}-${byteEnd}/${total}`
}
