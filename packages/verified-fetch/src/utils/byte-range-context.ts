import { calculateByteRangeIndexes, getHeader } from './request-headers.js'
import { getContentRangeHeader } from './response-headers.js'
import type { SupportedBodyTypes } from '../types.js'
import type { ComponentLogger, Logger } from '@libp2p/interface'

type SliceableBody = Exclude<SupportedBodyTypes, ReadableStream<Uint8Array> | null>

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

function getByteRangeFromHeader (rangeHeader: string): { start: string, end: string } {
  /**
   * Range: bytes=<start>-<end> | bytes=<start2>- | bytes=-<end2>
   */
  const match = rangeHeader.match(/^bytes=(?<start>\d+)?-(?<end>\d+)?$/)
  if (match?.groups == null) {
    throw new Error('Invalid range request')
  }

  const { start, end } = match.groups

  return { start, end }
}

export class ByteRangeContext {
  private readonly _isRangeRequest: boolean

  /**
   * This property should only be set by calling `setFileSize` or `setBody`.
   *
   * @access private
   */
  public fileSize: Readonly<number | null | undefined>
  private readonly _contentRangeHeaderValue: string | undefined
  private _body: SupportedBodyTypes = null
  private readonly _rangeRequestHeader: string | undefined
  private readonly log: Logger
  private _isValidRangeRequest: boolean | null = null
  private readonly requestRangeStart: number | null
  private readonly requestRangeEnd: number | null
  private byteStart: number | undefined
  private byteEnd: number | undefined
  private byteSize: number | undefined

  constructor (logger: ComponentLogger, private readonly headers?: HeadersInit) {
    this.log = logger.forComponent('helia:verified-fetch:byte-range-context')
    this._rangeRequestHeader = getHeader(this.headers, 'Range')
    if (this._rangeRequestHeader != null) {
      this.log.trace('range request detected')
      this._isRangeRequest = true
      try {
        const { start, end } = getByteRangeFromHeader(this._rangeRequestHeader)
        this.requestRangeStart = start != null ? parseInt(start) : null
        this.requestRangeEnd = end != null ? parseInt(end) : null
      } catch (e) {
        this.log.error('error parsing range request header: %o', e)
        this.isValidRangeRequest = false
        this.requestRangeStart = null
        this.requestRangeEnd = null
      }

      this.setOffsetDetails()
    } else {
      this.log.trace('no range request detected')
      this._isRangeRequest = false
      this.requestRangeStart = null
      this.requestRangeEnd = null
    }
  }

  /**
   * When you get a body, it should be set here, and we will calculate the fileSize if possible.
   */
  public setBody (body: SupportedBodyTypes): void {
    this._body = body
    // if fileSize was already set, don't recalculate it
    this.setFileSize(this.fileSize ?? getBodySizeSync(body))

    this.log.trace('set request body with fileSize %o', this.fileSize)
  }

  public getBody (): SupportedBodyTypes {
    const body = this._body
    if (body == null) {
      this.log.trace('body is null')
      return body
    }
    if (!this.isRangeRequest || !this.isValidRangeRequest) {
      this.log.trace('returning body unmodified for non-range, or invalid range, request')
      return body
    }
    const byteStart = this.byteStart
    const byteEnd = this.byteEnd
    const byteSize = this.byteSize
    if (byteStart != null || byteEnd != null) {
      this.log.trace('returning body with byteStart=%o, byteEnd=%o, byteSize=%o', byteStart, byteEnd, byteSize)
      if (body instanceof ReadableStream) {
        // stream should already be spliced by `unixfs.cat`
        return body
      }
      return this.getSlicedBody(body)
    }

    // we should not reach this point, but return body untouched.
    this.log.error('returning unmodified body for valid range request')
    return body
  }

  private getSlicedBody <T extends SliceableBody>(body: T): SliceableBody {
    if (this.isPrefixLengthRequest) {
      this.log.trace('sliced body with byteStart %o', this.byteStart)
      return body.slice(this.offset) satisfies SliceableBody
    }
    if (this.isSuffixLengthRequest && this.length != null) {
      this.log.trace('sliced body with length %o', -this.length)
      return body.slice(-this.length) satisfies SliceableBody
    }
    const offset = this.byteStart ?? 0
    const length = this.byteEnd == null ? undefined : this.byteEnd + 1
    this.log.trace('returning body with offset %o and length %o', offset, length)

    return body.slice(offset, length) satisfies SliceableBody
  }

  private get isSuffixLengthRequest (): boolean {
    return this.requestRangeStart == null && this.requestRangeEnd != null
  }

  private get isPrefixLengthRequest (): boolean {
    return this.requestRangeStart != null && this.requestRangeEnd == null
  }

  /**
   * Sometimes, we need to set the fileSize explicitly because we can't calculate
   * the size of the body (e.g. for unixfs content where we call .stat).
   *
   * This fileSize should otherwise only be called from `setBody`, and `.fileSize`
   * should not be set directly.
   */
  public setFileSize (size: number | bigint | null): void {
    this.fileSize = size != null ? Number(size) : null
    this.log.trace('set _fileSize to %o', this.fileSize)
    // when fileSize changes, we need to recalculate the offset details
    this.setOffsetDetails()
  }

  public get isRangeRequest (): boolean {
    return this._isRangeRequest
  }

  private isValidByteStart (): boolean {
    if (this.byteStart != null) {
      if (this.byteStart < 0) {
        return false
      }
      if (this.fileSize != null && this.byteStart > this.fileSize) {
        return false
      }
    }
    return true
  }

  private isValidByteEnd (): boolean {
    if (this.byteEnd != null) {
      if (this.byteEnd < 0) {
        return false
      }
      if (this.fileSize != null && this.byteEnd > this.fileSize) {
        return false
      }
    }
    return true
  }

  public set isValidRangeRequest (val: boolean) {
    this._isValidRangeRequest = val
  }

  public get isValidRangeRequest (): boolean {
    if (!this.isValidByteStart()) {
      this.log.trace('invalid range request, byteStart is less than 0 or greater than fileSize')
      this._isValidRangeRequest = false
    } else if (!this.isValidByteEnd()) {
      this.log.trace('invalid range request, byteEnd is less than 0 or greater than fileSize')
      this._isValidRangeRequest = false
    } else if (this.requestRangeEnd != null && this.requestRangeStart != null) {
      // we may not have enough info.. base check on requested bytes
      if (this.requestRangeStart > this.requestRangeEnd) {
        this.log.trace('invalid range request, start is greater than end')
        this._isValidRangeRequest = false
      } else if (this.requestRangeStart < 0) {
        this.log.trace('invalid range request, start is less than 0')
        this._isValidRangeRequest = false
      } else if (this.requestRangeEnd < 0) {
        this.log.trace('invalid range request, end is less than 0')
        this._isValidRangeRequest = false
      }
    }
    this._isValidRangeRequest = this._isValidRangeRequest ?? true

    return this._isValidRangeRequest
  }

  /**
   * Given all the information we have, this function returns the offset that will be used when:
   * 1. calling unixfs.cat
   * 2. slicing the body
   */
  public get offset (): number {
    if (this.byteStart === 0) {
      return 0
    }
    if (this.isPrefixLengthRequest || this.isSuffixLengthRequest) {
      if (this.byteStart != null) {
        // we have to subtract by 1 because the offset is inclusive
        return this.byteStart - 1
      }
    }

    return this.byteStart ?? 0
  }

  /**
   * Given all the information we have, this function returns the length that will be used when:
   * 1. calling unixfs.cat
   * 2. slicing the body
   */
  public get length (): number | undefined {
    return this.byteSize ?? undefined
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
    if (this.requestRangeStart == null && this.requestRangeEnd == null) {
      this.log.trace('requestRangeStart and requestRangeEnd are null')
      return
    }

    const { start, end, byteSize } = calculateByteRangeIndexes(this.requestRangeStart ?? undefined, this.requestRangeEnd ?? undefined, this.fileSize ?? undefined)
    this.log.trace('set byteStart to %o, byteEnd to %o, byteSize to %o', start, end, byteSize)
    this.byteStart = start
    this.byteEnd = end
    this.byteSize = byteSize
  }

  /**
   * This function returns the values of the "content-range" header.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Range
   *
   * Returns data to support the following content ranges:
   *
   * @example
   * - Content-Range: <unit> <byteStart>-<byteEnd>/<byteSize>
   * - Content-Range: <unit> <byteStart>-<byteEnd>/*
   */
  // - Content-Range: <unit> */<byteSize> // this is purposefully not in jsdoc block
  public get contentRangeHeaderValue (): string {
    if (this._contentRangeHeaderValue != null) {
      return this._contentRangeHeaderValue
    }
    if (!this.isValidRangeRequest) {
      this.log.error('cannot get contentRangeHeaderValue for invalid range request')
      throw new Error('Invalid range request')
    }

    return getContentRangeHeader({
      byteStart: this.byteStart,
      byteEnd: this.byteEnd,
      byteSize: this.fileSize ?? undefined
    })
  }
}
