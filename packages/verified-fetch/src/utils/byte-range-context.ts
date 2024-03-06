import { getHeader } from './request-headers.js'
import { splicingTransformStream } from './splicing-transform-stream.js'
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
  private _contentRangeHeaderValue: string | undefined
  private _body: SupportedBodyTypes | null = null
  private readonly _rangeRequestHeader: string | undefined
  private readonly log: Logger
  private _isValidRangeRequest: boolean | null = null
  private _offset: number | undefined = undefined
  private _length: number | undefined = undefined
  private readonly requestRangeStart: number | null
  private readonly requestRangeEnd: number | null
  // private responseRangeStart!: number
  // private responseRangeEnd!: number

  constructor (private readonly logger: ComponentLogger, private readonly headers?: HeadersInit) {
    this.log = logger.forComponent('helia:verified-fetch:byte-range-context')
    this._rangeRequestHeader = getHeader(this.headers, 'Range')
    if (this._rangeRequestHeader != null) {
      this.log.trace('Range request detected')
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
      this.log.trace('No range request detected')
      this._isRangeRequest = false
      this.requestRangeStart = null
      this.requestRangeEnd = null
    }
  }

  public setBody (body: SupportedBodyTypes): void {
    this._body = body
    // if fileSize was set explicitly or already set, don't recalculate it
    this.fileSize = this.fileSize ?? getBodySizeSync(body)
    this.setOffsetDetails()

    this.log.trace('set request body with fileSize %o', this._fileSize)
  }

  public getBody (): SupportedBodyTypes {
    this.log.trace('getting body, getBody')
    const body = this._body
    if (body == null) {
      this.log.trace('body is null')
      return body
    }
    if (!this.isRangeRequest || !this.isValidRangeRequest) {
      this.log.trace('returning body unmodified')
      return body
    }
    const offset = this.offset
    const length = this.length != null ? this.length : undefined
    if (offset != null || length != null) {
      this.log.trace('returning body with offset %o and length %o', offset, length)
      if (body instanceof Uint8Array) {
        this.log.trace('body is Uint8Array')
        return this.getSlicedBody(body, offset, length)
      } else if (body instanceof ArrayBuffer) {
        return this.getSlicedBody(body, offset, length)
      } else if (body instanceof Blob) {
        return this.getSlicedBody(body, offset, length)
      } else if (body instanceof ReadableStream) {
        return splicingTransformStream(body, offset, length, this.logger)
      }
    }
    // offset and length are not set, so not a range request, return body untouched.
    return body
  }

  private getSlicedBody <T extends Uint8Array | ArrayBuffer | Blob>(body: T, offset: number | undefined, length: number | undefined): T {
    if (offset != null && length != null) {
      return body.slice(offset, offset + length) as T
    } else if (offset != null) {
      return body.slice(offset) as T
    } else if (length != null) {
      return body.slice(0, length + 1) as T
    } else {
      return body
    }
  }

  public set fileSize (size: number | bigint | null) {
    this._fileSize = size != null ? Number(size) : null
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

  private set offset (val: number | undefined) {
    this._offset = this._offset ?? val ?? undefined
    this.log.trace('set _offset to %o', this._offset)
  }

  public get offset (): number | undefined {
    return this._offset
  }

  private set length (val: number | undefined) {
    this._length = val
    this.log.trace('set _length to %o', this._length)
  }

  public get length (): number | undefined {
    return this._length
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

    if (this.requestRangeStart != null && this.requestRangeEnd != null) {
      // we have a specific rangeRequest start & end
      this.offset = this.requestRangeStart
      this.length = this.requestRangeEnd
      // this.responseRangeEnd = this.requestRangeEnd
    } else if (this.requestRangeStart != null) {
      this.offset = this.requestRangeStart
      // we have a specific rangeRequest start
      if (this._fileSize != null) {
        const length = this._fileSize - this.offset
        this.log('only got offset, setting length to fileSize - offset', length)
        this.length = length
      } else {
        this.log.trace('only got offset, no fileSize')
      }
      // this.responseRangeEnd = this.length != null ? this.offset + this.length - 1 : 0 // Assign a default value of 0 if length is undefined
    } else if (this.requestRangeEnd != null) {
    // we have a specific rangeRequest end (suffix-length)
      this.length = this.requestRangeEnd
      this.offset = this._fileSize != null ? this._fileSize - this.length : undefined
      // this.responseRangeStart = this.offset != null ? this.offset : undefined
      // this.responseRangeEnd = this._fileSize != null ? this._fileSize - 1 : this.requestRangeEnd
    } else {
      this.log.trace('Not enough information to set offset and length')
    }
  }
  // private setOffsetDetails (): void {
  //   if (this.requestRangeStart == null && this.requestRangeEnd == null) {
  //     this.log.trace('requestRangeStart and requestRangeEnd are null')
  //     return
  //   }
  //   if (this.requestRangeStart != null && this.requestRangeEnd != null) {
  //     // we have a specific rangeRequest start & end
  //     this.offset = this.requestRangeStart
  //     this.length = this.requestRangeEnd - this.requestRangeStart
  //     this.responseRangeStart = this.requestRangeStart
  //     this.responseRangeEnd = this.requestRangeEnd
  //   } else if (this.requestRangeStart != null) {
  //     // we have a specific rangeRequest start
  //     this.offset = this.requestRangeStart
  //     this.responseRangeStart = this.offset
  //     if (this._fileSize != null) {
  //       this.length = this._fileSize - this.offset
  //       this.responseRangeEnd = this.offset + this.length
  //     } else {
  //       this.length = undefined
  //     }
  //   } else if (this.requestRangeEnd != null && this._fileSize != null) {
  //     // we have a specific rangeRequest end (suffix-length) & filesize
  //     const lengthRequested = this.requestRangeEnd
  //     // if the user requested length of N, the offset is N bytes from the end of the file
  //     this.offset = this._fileSize - lengthRequested
  //     this.length = lengthRequested
  //     this.responseRangeStart = this.offset === 0 ? this.offset : this.offset + 1
  //     this.responseRangeEnd = this._fileSize
  //   } else if (this.requestRangeEnd != null) {
  //     this.log.trace('requestRangeEnd %o, but no fileSize', this.requestRangeEnd)
  //     // we have a specific rangeRequest end (suffix-length) but no filesize
  //     this.offset = undefined
  //     this.length = this.requestRangeEnd
  //     this.responseRangeEnd = this.requestRangeEnd
  //   } else {
  //     this.log.trace('Not enough information to set offset and length')
  //   }
  // }

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
    const fileSize = this._fileSize ?? '*'
    // TODO: if the body is a Stream and we don't have the offset or length...
    // do we set "content-range" to:
    // "bytes <range-start>-*/*"
    // "bytes *-<range-end>/*"
    // or "bytes */*" ? Are these valid?
    // or do we want to consume the stream and calculate the size?
    let rangeStart = '*'
    let rangeEnd = '*'
    if (this._body instanceof ReadableStream) {
      rangeStart = this.requestRangeStart?.toString() ?? '*'
      rangeEnd = this.requestRangeEnd?.toString() ?? '*'
    } else if (this.requestRangeEnd != null && this.requestRangeStart != null) {
      rangeStart = this.requestRangeStart.toString()
      rangeEnd = this.requestRangeEnd.toString()
    } else if (this.requestRangeStart != null) {
      rangeStart = this.requestRangeStart.toString()
      rangeEnd = this._fileSize != null ? this._fileSize.toString() : '*'
    } else if (this.requestRangeEnd != null) {
      rangeEnd = this.requestRangeEnd.toString()
      rangeStart = this._fileSize != null ? (this._fileSize - this.requestRangeEnd).toString() : '*'
    }
    this._contentRangeHeaderValue = `bytes ${rangeStart}-${rangeEnd}/${fileSize}`
    this.log.trace('contentRangeHeaderValue: %o', this._contentRangeHeaderValue)
    return this._contentRangeHeaderValue
  }
}
