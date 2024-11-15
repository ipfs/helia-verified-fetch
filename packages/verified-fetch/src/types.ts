import { type AbortOptions, type PeerId } from '@libp2p/interface'
import { type CID } from 'multiformats/cid'
import type { VerifiedFetchInit } from './index.js'

export type RequestFormatShorthand = 'raw' | 'car' | 'tar' | 'ipns-record' | 'dag-json' | 'dag-cbor' | 'json' | 'cbor'

export type SupportedBodyTypes = string | ArrayBuffer | Blob | ReadableStream<Uint8Array> | null

export interface FetchHandlerFunctionArg {
  cid: CID
  peerId?: PeerId
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
