import { calculateByteRangeIndexes, getHeader } from './request-headers.js'
// import { splicingTransformStream } from './splicing-transform-stream.js'
import { getContentRangeHeader } from './response-headers.js'
import type { SupportedBodyTypes } from '../types.js'
import type { ComponentLogger, Logger } from '@libp2p/logger'

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
  private _fileSize: number | null | undefined
  private readonly _contentRangeHeaderValue: string | undefined
  private _body: SupportedBodyTypes | null = null
  private readonly _rangeRequestHeader: string | undefined
  private readonly log: Logger
  private _isValidRangeRequest: boolean | null = null
  // private _offset: number | undefined = undefined
  // private _length: number | undefined = undefined
  private readonly requestRangeStart: number | null
  private readonly requestRangeEnd: number | null
  byteStart: number | undefined
  byteEnd: number | undefined
  byteSize: number | undefined

  // private readonly actualLength: number | null
  // private responseRangeStart!: number
  // private responseRangeEnd!: number

  constructor (logger: ComponentLogger, private readonly headers?: HeadersInit) {
    this.log = logger.forComponent('helia:verified-fetch:byte-range-context')
    this._rangeRequestHeader = getHeader(this.headers, 'Range')
    if (this._rangeRequestHeader != null) {
      this.log.trace('Range request detected')
      this._isRangeRequest = true
      try {
        const { start, end } = getByteRangeFromHeader(this._rangeRequestHeader)
        this.requestRangeStart = start != null ? parseInt(start) : null
        this.requestRangeEnd = end != null ? parseInt(end) : null
        if (this.requestRangeStart != null && this.requestRangeEnd != null) {
          // we can set the length here

        } else {
          // this.actualLength = null
        }
      } catch (e) {
        this.log.error('error parsing range request header: %o', e)
        this.isValidRangeRequest = false
        this.requestRangeStart = null
        this.requestRangeEnd = null
        // this.actualLength = null
      }

      this.setOffsetDetails()
    } else {
      this.log.trace('No range request detected')
      this._isRangeRequest = false
      this.requestRangeStart = null
      this.requestRangeEnd = null
      // this.actualLength = null
    }
  }

  public setBody (body: SupportedBodyTypes): void {
    this._body = body
    // if fileSize was set explicitly or already set, don't recalculate it
    this.fileSize = this.fileSize ?? getBodySizeSync(body)

    this.log.trace('set request body with fileSize %o', this._fileSize)
  }

  public getBody (): SupportedBodyTypes {
    const body = this._body
    if (body == null) {
      this.log.trace('body is null')
      return body
    }
    if (!this.isRangeRequest || !this.isValidRangeRequest) {
      this.log.trace('returning body unmodified')
      return body
    }
    const byteStart = this.byteStart
    const byteEnd = this.byteEnd
    const byteSize = this.byteSize
    if (byteStart != null || byteEnd != null) {
      this.log.trace('returning body with byteStart %o byteEnd %o byteSize', byteStart, byteEnd, byteSize)
      if (body instanceof Uint8Array) {
        this.log.trace('body is Uint8Array')
        return this.getSlicedBody(body)
      } else if (body instanceof ArrayBuffer) {
        return this.getSlicedBody(body)
      } else if (body instanceof Blob) {
        return this.getSlicedBody(body)
      } else if (body instanceof ReadableStream) {
        // stream should already be spliced by dagPb/unixfs
        return body
        // return splicingTransformStream(body, offset, length, this.logger)
      }
    }
    // offset and length are not set, so not a range request, return body untouched.
    return body
  }

  private getSlicedBody <T extends Uint8Array | ArrayBuffer | Blob>(body: T): T {
    // if (offset != null && length != null) {
    //   this.log.trace('sliced body with offset %o and length %o', offset, length)
    //   return body.slice(offset, offset + length) as T
    // } else if (offset != null) {
    //   this.log.trace('sliced body with offset %o', offset)
    //   return body.slice(offset) as T
    // } else if (length != null) {
    //   this.log.trace('sliced body with length %o', length)
    //   return body.slice(0, length + 1) as T
    // }
    if (this.byteStart != null && this.byteEnd != null) {
      this.log.trace('sliced body with byteStart %o and byteEnd %o', this.byteStart, this.byteEnd)
      return body.slice(this.byteStart, this.byteSize ?? this.byteEnd + 1) as T
    } else if (this.byteStart != null) {
      this.log.trace('sliced body with byteStart %o', this.byteStart)
      return body.slice(this.byteStart) as T
    } else if (this.byteEnd != null) {
      this.log.trace('sliced body with byteEnd %o', this.byteStart)
      return body.slice(-this.byteEnd) as T
    } else if (this.byteSize != null) {
      this.log.trace('sliced body with byteSize %o', this.byteSize)
      return body.slice(0, this.byteSize + 1) as T
    }

    this.log.trace('returning body unmodified')
    return body
  }

  private get isSuffixLengthRequest (): boolean {
    return this.requestRangeStart == null && this.requestRangeEnd != null
  }

  private get isPrefixLengthRequest (): boolean {
    return this.requestRangeStart != null && this.requestRangeEnd == null
  }

  // sometimes, we need to set the fileSize explicitly because we can't calculate the size of the body (e.g. for unixfs content where we call .stat)
  public set fileSize (size: number | bigint | null) {
    this._fileSize = size != null ? Number(size) : null
    this.log.trace('set _fileSize to %o', this._fileSize)
    // if fileSize was set explicitly, we need to recalculate the offset details
    this.setOffsetDetails()
  }

  public get fileSize (): number | null | undefined {
    return this._fileSize
  }

  public get isRangeRequest (): boolean {
    return this._isRangeRequest
  }

  public set isValidRangeRequest (val: boolean) {
    this._isValidRangeRequest = val
  }

  public get isValidRangeRequest (): boolean {
    if (this.length != null && this.length < 0) {
      this.log.trace('invalid range request, length is less than 0')
      this._isValidRangeRequest = false
    } else if (this.offset != null && this.offset < 0) {
      this.log.trace('invalid range request, offset is less than 0')
      this._isValidRangeRequest = false
    } else if (this.length != null && this._fileSize != null && this.length > this._fileSize) {
      this.log.trace('invalid range request, length(%d) is greater than fileSize(%d)', this.length, this._fileSize)
      this._isValidRangeRequest = false
    } else if (this.requestRangeStart != null && this.requestRangeEnd != null) {
      if (this.requestRangeStart > this.requestRangeEnd) {
        this.log.trace('invalid range request, start is greater than end')
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
    if (this.byteStart == null || this.byteStart === 0) {
      return 0
    }
    // if length is undefined, unixfs.cat will not use an inclusive offset, so we have to subtract by 1
    // TODO: file tracking issue to fix this in unixfs.cat
    // if (this.length == null) {
    if (this.isPrefixLengthRequest || this.isSuffixLengthRequest) {
      return this.byteStart - 1
    }
    // this value will be passed to unixfs.cat
    return this.byteStart
  }

  /**
   * Given all the information we have, this function returns the length that will be used when:
   * 1. calling unixfs.cat
   * 2. slicing the body
   */
  public get length (): number | undefined {
    // this value will be passed to unixfs.cat.
    if (this.requestRangeEnd == null) {
      return undefined // this is a suffix-length request and unixfs has a bug where it doesn't always respect the length parameter
    }
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

    const { start, end, byteSize } = calculateByteRangeIndexes(this.requestRangeStart ?? undefined, this.requestRangeEnd ?? undefined, this._fileSize ?? undefined)
    this.log.trace('set byteStart to %o, byteEnd to %o, byteSize to %o', start, end, byteSize)
    this.byteStart = start
    this.byteEnd = end
    this.byteSize = byteSize
  }

  // This function returns the value of the "content-range" header.
  // Content-Range: <unit> <range-start>-<range-end>/<size>
  // Content-Range: <unit> <range-start>-<range-end>/*
  // Content-Range: <unit> */<size>
  // @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Range
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
      byteSize: this._fileSize ?? undefined
    })
  }
}
