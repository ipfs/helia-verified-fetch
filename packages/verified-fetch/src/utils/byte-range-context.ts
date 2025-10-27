import toBrowserReadableStream from 'it-to-browser-readablestream'
import { InvalidRangeError } from '../errors.js'
import { calculateByteRangeIndexes, getHeader } from './request-headers.js'
import { getContentRangeHeader } from './response-headers.js'
import type { SupportedBodyTypes } from '../index.js'
import type { Logger } from '@libp2p/interface'

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
  /**
   * multiPartBoundary is required for multipart responses
   */
  private readonly multiPartBoundary?: string
  private readonly requestRanges: Array<{ start: number | null, end: number | null }> = []
  private byteRanges: ByteRange[] = []
  readonly isMultiRangeRequest: boolean = false

  // to be set by isValidRangeRequest so that we don't need to re-check the byteRanges
  private _isValidRangeRequest: boolean = false

  constructor (logger: Logger, private readonly headers?: HeadersInit) {
    this.log = logger.newScope('byte-range-context')
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

        this.multiPartBoundary = `multipart_byteranges_${Math.floor(Math.random() * 1000000000)}`
      } catch (e) {
        this.log.error('error parsing range request header - %e', e)
        this.requestRanges = []
      }

      this.setOffsetDetails()
    } else {
      this.log.trace('no range request detected')
      this.isRangeRequest = false
    }
  }

  public getByteRanges (): ByteRange[] {
    return this.byteRanges
  }

  /**
   * You can pass a function when you need to support multi-range requests but have your own slicing logic, such as in the case of dag-pb/unixfs.
   *
   * @param bodyOrProvider - A supported body type or a function that returns a supported body type.
   * @param contentType - The content type of the body.
   */
  public setBody (
    bodyOrProvider: SupportedBodyTypes | ((range: ByteRange) => AsyncGenerator<Uint8Array, void, unknown>),
    contentType: string = 'application/octet-stream'
  ): void {
    if (typeof bodyOrProvider === 'function') {
      this._body = this.createRangeStream(bodyOrProvider, contentType)
    } else {
      this._body = bodyOrProvider

      // if fileSize was already set, don't recalculate it
      this.setFileSize(this._fileSize ?? getBodySizeSync(bodyOrProvider))
    }

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
      if (this._body instanceof ReadableStream) {
        return this._body
      }
      return toBrowserReadableStream(this.getMultipartBody(responseContentType))
    }

    // Single range request handling
    if (this.byteRanges.length > 0) {
      const range = this.byteRanges[0]
      if (body instanceof ReadableStream) {
        // stream should already be spliced by `unixfs.cat`
        // TODO: if the content is not unixfs and unixfs.cat was not called, we need to slice the body here.
        return body
      }
      if (range.start != null || range.end != null) {
        this.log.trace('returning body with byteStart=%o, byteEnd=%o, byteSize=%o', range.start, range.end, range.size)
      }
      return this.getSlicedBody(body, range)
    }

    // we should not reach this point, but return body untouched.
    this.log.error('returning unmodified body for valid range request')
    return body
  }

  private getSlicedBody <T extends SliceableBody>(body: T, range: ByteRange): SliceableBody {
    const offset = range.start ?? 0

    // Calculate the correct number of bytes to return
    // For a range like bytes=1000-2000, we want exactly 1001 bytes
    let length: number | undefined

    if (range.end != null && range.start != null) {
      // Exact number of bytes is (end - start + 1) due to inclusive ranges
      length = range.end - range.start + 1
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
    this._isValidRangeRequest = false // body has changed, so we need to re-validate the byte ranges
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
    if (this._isValidRangeRequest) {
      // prevent unnecessary re-validation of each byte range
      return true
    }
    if (!this.isRangeRequest) {
      return false
    }

    if (this.byteRanges.length === 0) {
      this.log.trace('invalid range request, no valid ranges')
      return false
    }

    const isValid = this.byteRanges.every(range => this.isValidByteRange(range))
    if (!isValid) {
      this.log.trace('invalid range request, not all ranges are valid')
      return false
    }

    this._isValidRangeRequest = true

    return true
  }

  // /**
  //  * Given all the information we have, this function returns the offset that will be used when:
  //  * 1. calling unixfs.cat
  //  * 2. slicing the body
  //  */
  // public offset (range: ByteRange): number {
  //   if (this.byteRanges.length > 0) {
  //     return this.byteRanges[0].start ?? 0
  //   }
  //   return 0
  // }

  /**
   * Given all the information we have, this function returns the length that will be used when:
   * 1. calling unixfs.cat
   * 2. slicing the body
   */
  public getLength (range?: ByteRange): number | undefined {
    if (!this.isValidRangeRequest) {
      this.log.error('cannot get length for invalid range request')
      return undefined
    }

    if (this.isMultiRangeRequest && range == null) {
      /**
       * The content-length for a multi-range request is the sum of the lengths of all the ranges, plus the boundaries and part headers and newlines.
       */
      // TODO: figure out a way to calculate the correct content-length for multi-range requests' response.
      return undefined
    }
    range ??= this.byteRanges[0]
    this.log.trace('getting length for range: %o', range)

    if (range.end != null && range.start != null) {
      // For a range like bytes=1000-2000, we want a length of 1001 bytes
      return range.end - range.start + 1
    }
    if (range.end != null) {
      return range.end + 1
    }
    return range.size
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
      // Calculate byte ranges for all requests
      this.byteRanges = this.requestRanges.map(range => {
        const { start, end, byteSize } = calculateByteRangeIndexes(
          range.start ?? undefined,
          range.end ?? undefined,
          this._fileSize ?? undefined
        )
        return { start, end, size: byteSize }
      })

      this.log.trace('set byte ranges: %o', this.byteRanges)
    } catch (e) {
      this.log.error('error setting offset details: %o', e)
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
      // in the case of unixfs, the body is a readable stream, and setBody is called with a function that returns a readable stream that generates the
      // correct multipartBody.. so we just return that body.
      return body
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

    if (this.byteRanges.length > 0) {
      const range = this.byteRanges[0]
      return getContentRangeHeader({
        byteStart: range.start,
        byteEnd: range.end,
        byteSize: this._fileSize ?? undefined
      })
    }

    throw new InvalidRangeError('No valid ranges found')
  }

  // Unified method to create a stream for either single or multi-range requests
  private createRangeStream (
    contentProvider: ((range: ByteRange) => AsyncGenerator<Uint8Array, void, unknown>),
    contentType: string
  ): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder()
    const byteRanges = this.byteRanges
    const multiPartBoundary = this.multiPartBoundary
    const fileSize = this._fileSize
    const log = this.log
    const isMultiRangeRequest = this.isMultiRangeRequest

    if (byteRanges.length === 0) {
      // TODO: create a stream with a range of *
      log.error('Cannot create range stream with no byte ranges')
      throw new InvalidRangeError('No valid ranges found')
    }

    return new ReadableStream({
      async start (controller) {
        try {
          // For multi-range requests, we need to handle multiple parts with headers
          for (const range of byteRanges) {
            // Write part header for multipart responses
            if (isMultiRangeRequest) {
              const partHeader =
                `\r\n--${multiPartBoundary}\r\n` +
                `Content-Type: ${contentType}\r\n` +
                `Content-Range: ${getContentRangeHeader({
                  byteStart: range.start,
                  byteEnd: range.end,
                  byteSize: fileSize ?? undefined
                })}\r\n\r\n`

              controller.enqueue(encoder.encode(partHeader))
            }

            // Get and stream content for this range
            try {
              // Get content for this range
              const rangeContent = contentProvider(range)
              for await (const chunk of rangeContent) {
                controller.enqueue(chunk)
              }
            } catch (err) {
              log.error('Error processing range %o: %o', range, err)
              throw err // Re-throw to be caught by the outer try/catch
            }
          }

          if (isMultiRangeRequest) {
            // Write final boundary for multipart
            controller.enqueue(encoder.encode(`\r\n--${multiPartBoundary}--`))
          }

          controller.close()
        } catch (err) {
          log.error('Error processing range(s): %o', err)
          controller.error(err)
        }
      }
    })
  }
}
