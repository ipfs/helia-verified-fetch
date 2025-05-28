export type RequestFormatShorthand = 'raw' | 'car' | 'tar' | 'ipns-record' | 'dag-json' | 'dag-cbor' | 'json' | 'cbor'

export type SupportedBodyTypes = string | Uint8Array | ArrayBuffer | Blob | ReadableStream<Uint8Array> | null

/**
 * A ContentTypeParser attempts to return the mime type of a given file. It
 * receives the first chunk of the file data and the file name, if it is
 * available.  The function can be sync or async and if it returns/resolves to
 * `undefined`, `application/octet-stream` will be used.
 */
export interface ContentTypeParser {
  /**
   * Attempt to determine a mime type, either via of the passed bytes or the
   * filename if it is available.
   */
  (bytes: Uint8Array, fileName?: string): Promise<string | undefined> | string | undefined
}
