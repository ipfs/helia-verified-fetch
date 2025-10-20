import { code as dagCborCode } from '@ipld/dag-cbor'
import { code as dagJsonCode } from '@ipld/dag-json'
import { code as dagPbCode } from '@ipld/dag-pb'
import { code as jsonCode } from 'multiformats/codecs/json'
import { code as rawCode } from 'multiformats/codecs/raw'
import type { RequestFormatShorthand } from '../index.js'
import type { CID } from 'multiformats/cid'

/**
 * This maps supported response types for each codec supported by verified-fetch
 */
const CID_TYPE_MAP: Record<number, string[]> = {
  [dagCborCode]: [
    'application/json',
    'application/vnd.ipld.dag-cbor',
    'application/cbor',
    'application/vnd.ipld.dag-json',
    'application/octet-stream',
    'application/vnd.ipld.raw',
    'application/vnd.ipfs.ipns-record',
    'application/vnd.ipld.car',
    'text/html'
  ],
  [dagJsonCode]: [
    'application/json',
    'application/vnd.ipld.dag-cbor',
    'application/cbor',
    'application/vnd.ipld.dag-json',
    'application/octet-stream',
    'application/vnd.ipld.raw',
    'application/vnd.ipfs.ipns-record',
    'application/vnd.ipld.car'
  ],
  [jsonCode]: [
    'application/json',
    'application/vnd.ipld.dag-cbor',
    'application/cbor',
    'application/vnd.ipld.dag-json',
    'application/octet-stream',
    'application/vnd.ipld.raw',
    'application/vnd.ipfs.ipns-record',
    'application/vnd.ipld.car'
  ],
  [dagPbCode]: [
    'application/octet-stream',
    'application/json',
    'application/vnd.ipld.dag-cbor',
    'application/cbor',
    'application/vnd.ipld.dag-json',
    'application/vnd.ipld.raw',
    'application/vnd.ipfs.ipns-record',
    'application/vnd.ipld.car',
    'application/x-tar'
  ],
  [rawCode]: [
    'application/octet-stream',
    'application/vnd.ipld.raw',
    'application/vnd.ipfs.ipns-record',
    'application/vnd.ipld.dag-json',
    'application/vnd.ipld.car',
    'application/x-tar'
  ]
}

export interface AcceptHeader {
  mimeType: string
  options: Record<string, string>
}

/**
 * Selects an output mime-type based on the CID and a passed `Accept` header
 */
export function selectOutputType (cid: CID, accept?: string): AcceptHeader | undefined {
  const cidMimeTypes = CID_TYPE_MAP[cid.code]

  if (accept != null) {
    return chooseMimeType(accept, cidMimeTypes)
  }
}

function chooseMimeType (accept: string, validMimeTypes: string[]): AcceptHeader | undefined {
  const requestedMimeTypes = accept
    .split(',')
    .map(s => {
      const parts = s.trim().split(';')

      const options: Record<string, string> = {
        q: '0'
      }

      for (let i = 1; i < parts.length; i++) {
        const [key, value] = parts[i].split('=').map(s => s.trim())

        options[key] = value
      }

      return {
        mimeType: `${parts[0]}`.trim(),
        options
      }
    })
    .sort((a, b) => {
      if (a.options.q === b.options.q) {
        return 0
      }

      if (a.options.q > b.options.q) {
        return -1
      }

      return 1
    })

  for (const headerFormat of requestedMimeTypes) {
    for (const mimeType of validMimeTypes) {
      if (headerFormat.mimeType.includes(mimeType)) {
        return headerFormat
      }

      if (headerFormat.mimeType === '*/*') {
        return {
          mimeType,
          options: headerFormat.options
        }
      }

      if (headerFormat.mimeType.startsWith('*/') && mimeType.split('/')[1] === headerFormat.mimeType.split('/')[1]) {
        return {
          mimeType,
          options: headerFormat.options
        }
      }

      if (headerFormat.mimeType.endsWith('/*') && mimeType.split('/')[0] === headerFormat.mimeType.split('/')[0]) {
        return {
          mimeType,
          options: headerFormat.options
        }
      }
    }
  }
}

export const FORMAT_TO_MIME_TYPE: Record<RequestFormatShorthand, string> = {
  raw: 'application/vnd.ipld.raw',
  car: 'application/vnd.ipld.car',
  'dag-json': 'application/vnd.ipld.dag-json',
  'dag-cbor': 'application/vnd.ipld.dag-cbor',
  json: 'application/json',
  cbor: 'application/cbor',
  'ipns-record': 'application/vnd.ipfs.ipns-record',
  tar: 'application/x-tar'
}

/**
 * Converts a `format=...` query param to a mime type as would be found in the
 * `Accept` header, if a valid mapping is available
 */
export function queryFormatToAcceptHeader (format?: RequestFormatShorthand): string | undefined {
  if (format != null) {
    return FORMAT_TO_MIME_TYPE[format]
  }
}
