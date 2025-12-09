import { code as dagCborCode } from '@ipld/dag-cbor'
import { code as dagJsonCode } from '@ipld/dag-json'
import { code as dagPbCode } from '@ipld/dag-pb'
import { code as jsonCode } from 'multiformats/codecs/json'
import { code as rawCode } from 'multiformats/codecs/raw'
import { CODEC_CBOR } from '../constants.ts'
import type { ContentType } from '../index.ts'
import type { CID } from 'multiformats/cid'

export const MEDIA_TYPE_DAG_CBOR = 'application/vnd.ipld.dag-cbor'
export const MEDIA_TYPE_CBOR = 'application/cbor'
export const MEDIA_TYPE_DAG_JSON = 'application/vnd.ipld.dag-json'
export const MEDIA_TYPE_JSON = 'application/json'
export const MEDIA_TYPE_RAW = 'application/vnd.ipld.raw'
export const MEDIA_TYPE_OCTET_STREAM = 'application/octet-stream'
export const MEDIA_TYPE_IPNS_RECORD = 'application/vnd.ipfs.ipns-record'
export const MEDIA_TYPE_CAR = 'application/vnd.ipld.car'
export const MEDIA_TYPE_TAR = 'application/x-tar'
export const MEDIA_TYPE_UNIXFS = 'application/vnd.ipld.dag-pb'

export const CONTENT_TYPE_OCTET_STREAM: ContentType = {
  mediaType: MEDIA_TYPE_OCTET_STREAM,
  codecs: [rawCode, jsonCode, dagJsonCode, CODEC_CBOR, dagCborCode, dagPbCode],
  immutable: true,
  suffix: '.bin',
  disposition: 'attachment'
}

export const CONTENT_TYPE_DAG_CBOR: ContentType = {
  mediaType: MEDIA_TYPE_DAG_CBOR,
  codecs: [dagCborCode, CODEC_CBOR, dagJsonCode, jsonCode, rawCode],
  immutable: true,
  suffix: '.cbor',
  disposition: 'attachment'
}

export const CONTENT_TYPE_CBOR: ContentType = {
  mediaType: MEDIA_TYPE_CBOR,
  codecs: [CODEC_CBOR, dagCborCode, dagJsonCode, jsonCode, rawCode],
  immutable: true,
  suffix: '.cbor',
  disposition: 'attachment'
}

export const CONTENT_TYPE_DAG_JSON: ContentType = {
  mediaType: MEDIA_TYPE_DAG_JSON,
  codecs: [dagJsonCode, jsonCode, dagCborCode, CODEC_CBOR, rawCode],
  immutable: true,
  suffix: '.json',
  disposition: 'inline'
}

export const CONTENT_TYPE_JSON: ContentType = {
  mediaType: MEDIA_TYPE_JSON,
  codecs: [jsonCode, dagJsonCode, dagCborCode, CODEC_CBOR, rawCode],
  immutable: true,
  suffix: '.json',
  disposition: 'inline'
}

export const CONTENT_TYPE_RAW: ContentType = {
  mediaType: MEDIA_TYPE_RAW,
  codecs: [rawCode, jsonCode, dagJsonCode, CODEC_CBOR, dagCborCode, dagPbCode],
  immutable: true,
  suffix: '.raw',
  disposition: 'attachment'
}

export const CONTENT_TYPE_IPNS: ContentType = {
  mediaType: MEDIA_TYPE_IPNS_RECORD,
  codecs: [],
  immutable: false,
  suffix: '.bin',
  disposition: 'attachment'
}

export const CONTENT_TYPE_CAR: ContentType = {
  mediaType: MEDIA_TYPE_CAR,
  codecs: [rawCode, jsonCode, dagJsonCode, CODEC_CBOR, dagCborCode, dagPbCode],
  immutable: false,
  suffix: '.car',
  disposition: 'attachment'
}

export const CONTENT_TYPE_TAR: ContentType = {
  mediaType: MEDIA_TYPE_TAR,
  codecs: [rawCode, dagPbCode],
  immutable: false,
  suffix: '.x-tar',
  disposition: 'attachment'
}

export const CONTENT_TYPES: ContentType[] = [
  CONTENT_TYPE_DAG_CBOR,
  CONTENT_TYPE_CBOR,
  CONTENT_TYPE_DAG_JSON,
  CONTENT_TYPE_JSON,
  CONTENT_TYPE_RAW,
  CONTENT_TYPE_IPNS,
  CONTENT_TYPE_CAR,
  CONTENT_TYPE_TAR,
  CONTENT_TYPE_OCTET_STREAM
]

export function getContentType (mediaType?: string | null): ContentType | undefined {
  return CONTENT_TYPES
    .find(m => m.mediaType === mediaType)
}

export function getContentTypesForCid (cid?: CID): ContentType[] {
  if (cid == null) {
    return []
  }

  return CONTENT_TYPES
    .filter(m => m.codecs.includes(cid.code))
    .sort((a, b) => {
      // prefer content types where the CID code is earlier in the list of
      // supported codecs
      const posA = a.codecs.indexOf(cid.code)
      const posB = b.codecs.indexOf(cid.code)

      if (posA < posB) {
        return -1
      }

      if (posB < posA) {
        return 1
      }

      return 0
    })
}

export function getSupportedContentTypes (protocol: string = 'ipfs:', cid?: CID): ContentType[] {
  let contentTypes = getContentTypesForCid(cid)

  if (protocol === 'ipfs:' && contentTypes.length === 0) {
    contentTypes = [
      CONTENT_TYPE_RAW,
      CONTENT_TYPE_OCTET_STREAM
    ]
  }

  if (protocol === 'ipns:') {
    contentTypes.push(CONTENT_TYPE_IPNS)
  }

  return contentTypes
}
