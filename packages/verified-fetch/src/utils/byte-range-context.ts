import toBrowserReadableStream from 'it-to-browser-readablestream'
import { InvalidRangeError } from '../errors.js'
import { calculateByteRangeIndexes, getHeader } from './request-headers.js'
import { getContentRangeHeader } from './response-headers.js'
import type { SupportedBodyTypes } from '../types.js'
import type { ComponentLogger, Logger } from '@libp2p/interface'

type SliceableBody = Exclude<SupportedBodyTypes, ReadableStream<Uint8Array> | null>

interface RequestRange {
  start: number | undefined
  end: number | undefined
}

interface ByteRange extends RequestRange {
  size: number | undefined
}

/**
 * Gets the body size of a given body if it's possible to calculate it synchronously.
 */
function getBodySizeSync (body: SupportedBodyTypes): number | null {
  if (typeof body === 'string') {
    return body.length
  }
  if (body instanceof ArrayBuffer || body instanceof Uint8Array) {
    return body.byteLength
  }
  if (body instanceof Blob) {
    return body.size
  }

  if (body instanceof ReadableStream) {
    return null
  }

  return null
}

function getByteRangeFromHeader (rangeHeader: string): { ranges: Array<{ start: string | null, end: string | null }> } {
  /**
   * Range: bytes=<start>-<end> | bytes=<start2>- | bytes=-<end2> | bytes=<start1>-<end1>,<start2>-<end2>,...
   */
  if (!rangeHeader.startsWith('bytes=')) {
    throw new InvalidRangeError('Invalid range request')
  }

  const rangesStr = rangeHeader.substring(6) // Remove "bytes=" prefix
  const rangeParts = rangesStr.split(',').map(part => part.trim())
  const ranges: Array<{ start: string | null, end: string | null }> = []

  for (const part of rangeParts) {
    const match = part.match(/^(?<start>\d+)?-(?<end>\d+)?$/)
    if (match?.groups == null) {
      throw new InvalidRangeError(`Invalid range specification: ${part}`)
    }

    const { start, end } = match.groups
    ranges.push({
      start: start ?? null,
      end: end ?? null
    })
  }

  if (ranges.length === 0) {
    throw new InvalidRangeError('No valid ranges found')
  }

  return { ranges }
}

export class ByteRangeContext {
  public readonly isRangeRequest: boolean

  /**
   * This property is purposefully only set in `set fileSize` and should not be set directly.
   */
  private _fileSize: number | null | undefined
  private _body: SupportedBodyTypes = null
  private readonly rangeRequestHeader: string | undefined
  private readonly log: Logger
  private readonly requestRangeStart: number | null
  private readonly requestRangeEnd: number | null
  /**
   * multiPartBoundary is required for multipart responses
   */
  private readonly multiPartBoundary?: string
  private byteStart: number | undefined
  private byteEnd: number | undefined
  private byteSize: number | undefined
  private readonly requestRanges: Array<{ start: number | null, end: number | null }> = []
  private byteRanges: ByteRange[] = []
  readonly isMultiRangeRequest: boolean = false

  constructor (logger: ComponentLogger, private readonly headers?: HeadersInit) {
    this.log = logger.forComponent('helia:verified-fetch:byte-range-context')
    this.rangeRequestHeader = getHeader(this.headers, 'Range')

    if (this.rangeRequestHeader != null) {
      this.isRangeRequest = true
      this.log.trace('range request detected')

      try {
        const { ranges } = getByteRangeFromHeader(this.rangeRequestHeader)
        this.isMultiRangeRequest = ranges.length > 1

        this.requestRanges = ranges.map(range => ({
          start: range.start != null ? parseInt(range.start) : null,
          end: range.end != null ? parseInt(range.end) : null
        }))

        // For backward compatibility, also set single-range properties when there's only one range
        if (!this.isMultiRangeRequest && this.requestRanges.length === 1) {
          this.requestRangeStart = this.requestRanges[0].start
          this.requestRangeEnd = this.requestRanges[0].end
        } else {
          this.requestRangeStart = null
          this.requestRangeEnd = null

          this.multiPartBoundary = `multipart_byteranges_${Math.floor(Math.random() * 1000000000)}`
        }
      } catch (e) {
        this.log.error('error parsing range request header: %o', e)
        this.requestRanges = []
        this.requestRangeStart = null
        this.requestRangeEnd = null
      }

      this.setOffsetDetails()
    } else {
      this.log.trace('no range request detected')
      this.isRangeRequest = false
      this.requestRangeStart = null
      this.requestRangeEnd = null
    }
  }

  public setBody (body: SupportedBodyTypes): void {
    this._body = body
    // if fileSize was already set, don't recalculate it
    this.setFileSize(this._fileSize ?? getBodySizeSync(body))

    this.log.trace('set request body with fileSize %o', this._fileSize)
  }

  public getBody (responseContentType?: string): SupportedBodyTypes {
    const body = this._body
    if (body == null) {
      this.log.trace('body is null')
      return body
    }

    if (!this.isRangeRequest || !this.isValidRangeRequest) {
      this.log.trace('returning body unmodified for non-range, or invalid range, request')
      return body
    }

    if (this.isMultiRangeRequest) {
      return toBrowserReadableStream(this.getMultipartBody(responseContentType))
    }

    // Single range request handling (existing code)
    const byteStart = this.byteStart
    const byteEnd = this.byteEnd
    const byteSize = this.byteSize
    if (byteStart != null || byteEnd != null) {
      this.log.trace('returning body with byteStart=%o, byteEnd=%o, byteSize=%o', byteStart, byteEnd, byteSize)
      if (body instanceof ReadableStream) {
        // stream should already be spliced by `unixfs.cat`
        // TODO: if the content is not unixfs and unixfs.cat was not called, we need to slice the body here.
        return body
      }
      return this.getSlicedBody(body)
    }

    // we should not reach this point, but return body untouched.
    this.log.error('returning unmodified body for valid range request')
    return body
  }

  private getSlicedBody <T extends SliceableBody>(body: T): SliceableBody {
    const offset = this.byteStart ?? 0

    // Calculate the correct number of bytes to return
    // For a range like bytes=1000-2000, we want exactly 1001 bytes
    let length: number | undefined

    if (this.byteEnd != null && this.byteStart != null) {
      // Exact number of bytes is (end - start + 1) due to inclusive ranges
      length = this.byteEnd - this.byteStart + 1
    } else {
      length = undefined
    }

    this.log.trace('slicing body with offset=%o and length=%o', offset, length)

    if (typeof body === 'string') {
      // String slicing works with start and end indices
      return body.slice(offset, length !== undefined ? offset + length : undefined) satisfies SliceableBody
    } else if (body instanceof Blob) {
      // Blob.slice takes start and end positions
      return body.slice(offset, length !== undefined ? offset + length : undefined) satisfies SliceableBody
    } else if (body instanceof ArrayBuffer || body instanceof Uint8Array) {
      // ArrayBuffer.slice and Uint8Array.slice take start and end positions
      return body.slice(offset, length !== undefined ? offset + length : undefined) satisfies SliceableBody
    }

    // This should never happen due to type constraints
    return body satisfies SliceableBody
  }

  /**
   * Sometimes, we need to set the fileSize explicitly because we can't calculate
   * the size of the body (e.g. for unixfs content where we call .stat).
   *
   * This fileSize should otherwise only be called from `setBody`.
   */
  public setFileSize (size: number | bigint | null): void {
    this._fileSize = size != null ? Number(size) : null
    this.log.trace('set _fileSize to %o', this._fileSize)
    // when fileSize changes, we need to recalculate the offset details
    this.setOffsetDetails()
  }

  public getFileSize (): number | null | undefined {
    return this._fileSize
  }

  private isValidByteStart (byteStart: number | undefined, byteEnd: number | undefined): boolean {
    if (byteStart != null) {
      if (byteStart < 0) {
        return false
      }
      if (this._fileSize != null && byteStart >= this._fileSize) {
        return false
      }
      if (byteEnd != null && byteStart > byteEnd) {
        return false
      }
    }
    return true
  }

  private isValidByteEnd (byteStart: number | undefined, byteEnd: number | undefined): boolean {
    if (byteEnd != null) {
      if (byteEnd < 0) {
        this.log.trace('invalid range request, byteEnd is less than 0')
        return false
      }
      if (this._fileSize != null && byteEnd >= this._fileSize) {
        this.log.trace('invalid range request, byteEnd is greater than fileSize')
        return false
      }
      if (byteStart != null && byteEnd < byteStart) {
        this.log.trace('invalid range request, byteEnd is less than byteStart')
        return false
      }
    }
    return true
  }

  private isValidByteRange (range: ByteRange): boolean {
    this.log.trace('validating byte range: %o', range)
    if (range.start != null && !this.isValidByteStart(range.start, range.end)) {
      this.log.trace('invalid range request, byteStart is less than 0 or greater than fileSize')
      return false
    }
    if (range.end != null && !this.isValidByteEnd(range.start, range.end)) {
      this.log.trace('invalid range request, byteEnd is less than 0 or greater than fileSize')
      return false
    }

    return true
  }

  /**
   * We may get the values required to determine if this is a valid range request at different times
   * so we need to calculate it when asked.
   */
  public get isValidRangeRequest (): boolean {
    if (!this.isRangeRequest) {
      return false
    }

    if (this.isMultiRangeRequest) {
      // For multipart requests, check if at least one range is valid
      if (this.byteRanges.length === 0) {
        this.log.trace('invalid range request, no valid ranges')
        return false
      }

      const isValid = this.byteRanges.every(range => this.isValidByteRange(range))
      if (!isValid) {
        this.log.trace('invalid range request, not all ranges are valid')
        return false
      }
      return true
    }

    // Single range validation (existing code)
    if (this.requestRangeStart == null && this.requestRangeEnd == null) {
      this.log.trace('invalid range request, range request values not provided')
      return false
    }
    if (!this.isValidByteStart(this.byteStart, this.byteEnd)) {
      this.log.trace('invalid range request, byteStart is less than 0 or greater than fileSize')
      return false
    }
    if (!this.isValidByteEnd(this.byteStart, this.byteEnd)) {
      this.log.trace('invalid range request, byteEnd is less than 0 or greater than fileSize')
      return false
    }
    if (this.requestRangeEnd != null && this.requestRangeStart != null) {
      // we may not have enough info.. base check on requested bytes
      if (this.requestRangeStart > this.requestRangeEnd) {
        this.log.trace('invalid range request, start is greater than end')
        return false
      } else if (this.requestRangeStart < 0) {
        this.log.trace('invalid range request, start is less than 0')
        return false
      } else if (this.requestRangeEnd < 0) {
        this.log.trace('invalid range request, end is less than 0')
        return false
      }
    }
    if (this.byteEnd == null && this.byteStart == null && this.byteSize == null) {
      this.log.trace('invalid range request, could not calculate byteStart, byteEnd, or byteSize')
      return false
    }

    return true
  }

  /**
   * Given all the information we have, this function returns the offset that will be used when:
   * 1. calling unixfs.cat
   * 2. slicing the body
   */
  public get offset (): number {
    return this.byteStart ?? 0
  }

  /**
   * Given all the information we have, this function returns the length that will be used when:
   * 1. calling unixfs.cat
   * 2. slicing the body
   */
  public get length (): number | undefined {
    if (this.isMultiRangeRequest) {
      return this.getLengthForMultiRangeRequest()
    }
    if (this.byteEnd != null && this.byteStart != null) {
      // For a range like bytes=1000-2000, we want a length of 1001 bytes
      return this.byteEnd - this.byteStart + 1
    }
    if (this.byteEnd != null) {
      return this.byteEnd + 1
    }

    return this.byteSize
  }

  /**
   * The content-length for a multi-range request is the sum of the lengths of all the ranges, plus the boundaries and part headers and newlines.
   */
  private getLengthForMultiRangeRequest (): number | undefined {
    // return this.byteRanges.reduce((acc, range) => acc + (range.end ?? 0) - (range.start ?? 0) + 1, 0)
    return undefined
  }

  /**
   * Converts a range request header into helia/unixfs supported range options
   * Note that the gateway specification says we "MAY" support multiple ranges (https://specs.ipfs.tech/http-gateways/path-gateway/#range-request-header) but we don't
   *
   * Also note that @helia/unixfs and ipfs-unixfs-exporter expect length and offset to be numbers, the range header is a string, and the size of the resource is likely a bigint.
   *
   * SUPPORTED:
   * Range: bytes=<range-start>-<range-end>
   * Range: bytes=<range-start>-
   * Range: bytes=-<suffix-length> // must pass size so we can calculate the offset. suffix-length is the number of bytes from the end of the file.
   *
   * NOT SUPPORTED:
   * Range: bytes=<range-start>-<range-end>, <range-start>-<range-end>
   * Range: bytes=<range-start>-<range-end>, <range-start>-<range-end>, <range-start>-<range-end>
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Range#directives
   */
  private setOffsetDetails (): void {
    if (this.requestRanges.length === 0) {
      this.log.trace('no request ranges defined')
      return
    }

    try {
      if (this.isMultiRangeRequest) {
        this.byteRanges = this.requestRanges.map(range => {
          const { start, end, byteSize } = calculateByteRangeIndexes(
            range.start ?? undefined,
            range.end ?? undefined,
            this._fileSize ?? undefined
          )
          return { start, end, size: byteSize }
        })

        // Also update single-range properties for backward compatibility
        const firstRange = this.byteRanges[0]
        this.byteStart = firstRange.start
        this.byteEnd = firstRange.end
        this.byteSize = firstRange.size
      } else {
        const { start, end, byteSize } = calculateByteRangeIndexes(
          this.requestRangeStart ?? undefined,
          this.requestRangeEnd ?? undefined,
          this._fileSize ?? undefined
        )
        this.byteStart = start
        this.byteEnd = end
        this.byteSize = byteSize

        // Update the multi-range structure for consistency
        this.byteRanges = [{ start, end, size: byteSize }]
      }

      this.log.trace('set byte ranges: %o', this.byteRanges)
    } catch (e) {
      this.log.error('error setting offset details: %o', e)
      this.byteStart = undefined
      this.byteEnd = undefined
      this.byteSize = undefined
      this.byteRanges = []
    }
  }

  /**
   * Helper to convert a SliceableBody to a Uint8Array
   */
  private async convertToUint8Array (content: SliceableBody): Promise<Uint8Array> {
    if (typeof content === 'string') {
      return new TextEncoder().encode(content)
    }

    if ('arrayBuffer' in content && typeof content.arrayBuffer === 'function') {
      // This is a Blob
      const buffer = await content.arrayBuffer()
      return new Uint8Array(buffer)
    }

    if ('byteLength' in content && !('buffer' in content)) {
      // This is an ArrayBuffer
      return new Uint8Array(content)
    }

    if ('buffer' in content && 'byteLength' in content && 'byteOffset' in content) {
      // This is a Uint8Array
      return content as Uint8Array
    }

    throw new Error('Unsupported content type for multipart response')
  }

  private async * getMultipartBody (responseContentType: string = 'application/octet-stream'): AsyncIterable<Uint8Array> {
    const body = this._body
    if (body instanceof ReadableStream) {
      // ReadableStream not supported for multi-range requests
      throw new Error('ReadableStream is not supported for multi-range requests')
    }

    if (body === null) {
      throw new Error('Cannot create multipart body from null')
    }

    const encoder = new TextEncoder()

    for (const range of this.byteRanges) {
      if (range.start === undefined || range.end === undefined) {
        continue
      }

      // Calculate part headers
      const partHeaderString =
        `\r\n--${this.multiPartBoundary}\r\n` +
        `Content-Type: ${responseContentType}\r\n` +
        `Content-Range: ${getContentRangeHeader({
          byteStart: range.start,
          byteEnd: range.end,
          byteSize: this._fileSize ?? undefined
        })}\r\n\r\n`

      // Convert header to Uint8Array
      yield encoder.encode(partHeaderString)

      // Get content for this range and convert to Uint8Array
      const slicedContent = this.getSlicedBodyForRange(body, range.start, range.end)
      yield await this.convertToUint8Array(slicedContent)
    }

    // Add final this.multiPartBoundary
    yield encoder.encode(`\r\n--${this.multiPartBoundary}--`)
  }

  private getSlicedBodyForRange<T extends SliceableBody>(
    body: T,
    start: number,
    end: number
  ): SliceableBody {
    // Calculate the correct number of bytes to return
    // For a range like bytes=1000-2000, we want exactly 1001 bytes
    const offset = start
    const length = end - start + 1

    this.log.trace('slicing body with offset=%o and length=%o', offset, length)

    if (typeof body === 'string') {
      return body.slice(offset, offset + length) satisfies SliceableBody
    } else if (body instanceof Blob) {
      return body.slice(offset, offset + length) satisfies SliceableBody
    } else if (body instanceof ArrayBuffer || body instanceof Uint8Array) {
      return body.slice(offset, offset + length) satisfies SliceableBody
    } else {
      // This should never happen due to type constraints
      return body as SliceableBody
    }
  }

  /**
   * Returns the content type for the response.
   * For multipart ranges, this will be multipart/byteranges with a boundary.
   */
  public getContentType (): string | undefined {
    if (this.isMultiRangeRequest && this.isValidRangeRequest) {
      return `multipart/byteranges; boundary=${this.multiPartBoundary}`
    }
    return undefined
  }

  /**
   * This function returns the value of the "content-range" header.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Range
   *
   * Returns a string representing the following content ranges:
   *
   * @example
   * - Content-Range: <unit> <byteStart>-<byteEnd>/<byteSize>
   * - Content-Range: <unit> <byteStart>-<byteEnd>/*
   */
  // - Content-Range: <unit> */<byteSize> // this is purposefully not in jsdoc block
  public get contentRangeHeaderValue (): string {
    // For multipart responses, this will be included in each part
    // So this method is only used for single-range responses
    if (!this.isValidRangeRequest) {
      this.log.error('cannot get contentRangeHeaderValue for invalid range request')
      throw new InvalidRangeError('Invalid range request')
    }

    if (this.isMultiRangeRequest) {
      this.log.error('contentRangeHeaderValue should not be called for multipart responses')
      throw new InvalidRangeError('Content-Range header not applicable for multipart responses')
    }

    return getContentRangeHeader({
      byteStart: this.byteStart,
      byteEnd: this.byteEnd,
      byteSize: this._fileSize ?? undefined
    })
  }
}
