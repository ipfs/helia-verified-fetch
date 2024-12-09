import { type AbortOptions } from '@libp2p/interface'
import { type CID } from 'multiformats/cid'
import type { VerifiedFetchInit } from './index.js'

export type RequestFormatShorthand = 'raw' | 'car' | 'tar' | 'ipns-record' | 'dag-json' | 'dag-cbor' | 'json' | 'cbor'

export type SupportedBodyTypes = string | ArrayBuffer | Blob | ReadableStream<Uint8Array> | null

export interface FetchHandlerFunctionArg {
  cid: CID
  path: string

  /**
   * Whether to use a session during fetch operations
   *
   * @default true
   */
  session: boolean

  options?: Omit<VerifiedFetchInit, 'signal'> & AbortOptions

  /**
   * If present, the user has sent an accept header with this value - if the
   * content cannot be represented in this format a 406 should be returned
   */
  accept?: string

  /**
   * The originally requested resource
   */
  resource: string
}

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
