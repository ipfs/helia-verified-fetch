import { getHeader } from './request-headers.js'
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
  private readonly requestRangeStart!: string | undefined
  private readonly requestRangeEnd!: string | undefined
  private responseRangeStart!: number
  private responseRangeEnd!: number

  constructor (logger: ComponentLogger, private readonly headers?: HeadersInit) {
    this.log = logger.forComponent('helia:verified-fetch:byte-range-context')
    this._rangeRequestHeader = getHeader(this.headers, 'Range')
    if (this._rangeRequestHeader != null) {
      this.log.trace('Range request detected')
      this._isRangeRequest = true
      try {
        const { start, end } = getByteRangeFromHeader(this._rangeRequestHeader)
        this.requestRangeStart = start
        this.requestRangeEnd = end
      } catch (e) {
        this.log.error('error parsing range request header: %o', e)
        this.isValidRangeRequest = false
      }

      this.setOffsetDetails()
    } else {
      this.log.trace('No range request detected')
      this._isRangeRequest = false
      this.requestRangeStart = undefined
      this.requestRangeEnd = undefined
    }

    this.log.trace('created ByteRangeContext with headers %o. is range request? %s, is valid range? %s', this.headers, this._isRangeRequest, this.isValidRangeRequest)
  }

  public set body (body: SupportedBodyTypes) {
    this._body = body
    // if fileSize was set explicitly or already set, don't recalculate it
    this.fileSize = this.fileSize ?? getBodySizeSync(body)
    this.setOffsetDetails()

    this.log.trace('set request body with fileSize %o', this._fileSize)
  }

  public get body (): SupportedBodyTypes {
    this.log.trace('getting body')
    const body = this._body
    if (body == null) {
      this.log.trace('body is null')
      return body
    }
    if (!this.isRangeRequest || !this.isValidRangeRequest) {
      this.log.trace('returning body without offset or length')
      return body
    }
    const offset = this.offset
    const length = this.length
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
        // TODO: if offset and length is not null, will the browser handle this?
        return this.getSlicedStream(body, offset, length)
      }
    }
    // offset and length are not set, so not a range request, return body untouched.
    return body
  }

  private getSlicedBody <T extends Uint8Array | ArrayBuffer | Blob>(body: T, offset: number | undefined, length: number | undefined): T {
    // const bodySize = body instanceof Blob ? body.size : body.byteLength
    this.log.trace('slicing body with offset %o and length %o', offset, length)
    try {
      if (offset != null && length != null) {
        return body.slice(offset, offset + length) as T
      } else if (offset != null) {
        return body.slice(offset) as T
      } else if (length != null) {
        return body.slice(0, length + 1) as T
      } else {
        return body
      }
    } catch (e) {
      this.log.error('error slicing Uint8Array: %o', e)
      throw e
    }
  }

  /**
   * If a user requests a range of bytes from a ReadableStream, we need to read the stream and enqueue only the requested bytes.
   */
  private getSlicedStream (body: ReadableStream<Uint8Array>, offset: number | undefined, length: number | undefined): ReadableStream {
    const reader = body.getReader()
    return new ReadableStream({
      // async start (controller) {
      //   if (offset != null) {
      //     // skip bytes until we reach the offset
      //     let bytesRead = 0
      //     while (bytesRead < offset) {
      //       const { value, done } = await reader.read()
      //       if (done) {
      //         break
      //       }
      //       bytesRead += value.byteLength
      //     }
      //   }
      // },
      async pull (controller) {
        if (length == null) {
          const { value, done } = await reader.read()
          if (done) {
            controller.close()
            return
          }
          controller.enqueue(value)
          return
        }
        let bytesRead = 0
        let bytesRemaining = length
        while (bytesRead < length) {
          const { value, done } = await reader.read()
          if (done) {
            controller.close()
            return
          }
          if (value.byteLength > bytesRemaining) {
            controller.enqueue(value.slice(0, bytesRemaining))
            bytesRead += bytesRemaining
            return
          }
          bytesRead += value.byteLength
          bytesRemaining -= value.byteLength
          controller.enqueue(value)
        }
      }
    })
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
      this._isValidRangeRequest = false
    } else if (this.offset != null && this.offset < 0) {
      this._isValidRangeRequest = false
    } else if (this.length != null && this._fileSize != null && this.length > this._fileSize) {
      this._isValidRangeRequest = false
    } else if (this.requestRangeStart != null && this.requestRangeEnd != null) {
      if (parseInt(this.requestRangeStart) > parseInt(this.requestRangeEnd)) {
        this._isValidRangeRequest = false
      }
    }
    this._isValidRangeRequest = this._isValidRangeRequest ?? true

    return this._isValidRangeRequest
  }

  private set offset (val: number | undefined) {
    this._offset = this._offset ?? val
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
    this.log.trace('requestRangeStart %o, requestRangeEnd %o', this.requestRangeStart, this.requestRangeEnd)
    if (this.requestRangeStart != null && this.requestRangeEnd != null) {
      // we have a specific rangeRequest start & end
      this.offset = parseInt(this.requestRangeStart)
      this.length = parseInt(this.requestRangeEnd) - this.offset + 1
      this.responseRangeStart = this.offset
      this.responseRangeEnd = this.offset + this.length - 1
    } else if (this.requestRangeStart != null) {
      // we have a specific rangeRequest start
      this.offset = parseInt(this.requestRangeStart)
      this.responseRangeStart = this.offset
      if (this._fileSize != null) {
        this.length = this._fileSize - this.offset + 1
        this.responseRangeEnd = this.offset + this.length - 1
      } else {
        this.length = undefined
      }
    } else if (this.requestRangeEnd != null && this._fileSize != null) {
      this.log.trace('requestRangeEnd %o, fileSize %o', this.requestRangeEnd, this._fileSize)
      // we have a specific rangeRequest end (suffix-length) & filesize
      const lengthRequested = parseInt(this.requestRangeEnd)
      // if the user requested length of N, the offset is N bytes from the end of the file
      this.offset = this._fileSize - lengthRequested
      this.length = lengthRequested
      this.responseRangeStart = this.offset // inclusive
      this.responseRangeEnd = this._fileSize // inclusive
    } else {
      this.log.trace('Not enough information to set offset and length')
    }
  }

  public get contentRangeHeaderValue (): string {
    if (this._contentRangeHeaderValue != null) {
      return this._contentRangeHeaderValue
    }
    if (!this.isValidRangeRequest) {
      this.log.error('cannot get contentRangeHeaderValue for invalid range request')
      throw new Error('Invalid range request')
    }
    const fileSize = this._fileSize ?? '*'
    this._contentRangeHeaderValue = `bytes ${this.responseRangeStart}-${this.responseRangeEnd}/${fileSize}`
    return this._contentRangeHeaderValue
  }
}
