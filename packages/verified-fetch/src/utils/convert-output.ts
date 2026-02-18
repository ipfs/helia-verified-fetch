import * as dagCbor from '@ipld/dag-cbor'
import * as dagJson from '@ipld/dag-json'
import * as dagPb from '@ipld/dag-pb'
import * as json from 'multiformats/codecs/json'
import * as raw from 'multiformats/codecs/raw'
import { identity } from 'multiformats/hashes/identity'
import { CODEC_CBOR } from '../constants.ts'
import { getContentTypesForCid, MEDIA_TYPE_CBOR, MEDIA_TYPE_DAG_CBOR, MEDIA_TYPE_DAG_JSON, MEDIA_TYPE_JSON, MEDIA_TYPE_OCTET_STREAM, MEDIA_TYPE_RAW } from './content-types.ts'
import type { AcceptHeader, ContentType } from '../index.ts'
import type { CID } from 'multiformats/cid'

const CONVERSIONS: Record<number, Record<string, (buf: Uint8Array) => Uint8Array>> = {
  [dagCbor.code]: {
    [MEDIA_TYPE_CBOR]: (buf) => {
      return buf
    },
    [MEDIA_TYPE_DAG_CBOR]: (buf) => {
      return buf
    },
    [MEDIA_TYPE_JSON]: (buf) => {
      return dagJson.encode(dagCbor.decode(buf))
    },
    [MEDIA_TYPE_DAG_JSON]: () => {
      throw new Error('Cannot perform conversion since IPIP-0524')
    },
    [MEDIA_TYPE_RAW]: (buf) => {
      return buf
    },
    [MEDIA_TYPE_OCTET_STREAM]: (buf) => {
      return buf
    }
  },
  [CODEC_CBOR]: {
    [MEDIA_TYPE_CBOR]: (buf) => {
      return buf
    },
    [MEDIA_TYPE_DAG_CBOR]: (buf) => {
      return buf
    },
    [MEDIA_TYPE_JSON]: (buf) => {
      return buf
    },
    [MEDIA_TYPE_DAG_JSON]: (buf) => {
      return dagJson.encode(dagCbor.decode(buf))
    },
    [MEDIA_TYPE_RAW]: (buf) => {
      return buf
    },
    [MEDIA_TYPE_OCTET_STREAM]: (buf) => {
      return buf
    }
  },
  [dagJson.code]: {
    [MEDIA_TYPE_CBOR]: (buf) => {
      return buf
    },
    [MEDIA_TYPE_DAG_CBOR]: () => {
      throw new Error('Cannot perform conversion since IPIP-0524')
    },
    [MEDIA_TYPE_JSON]: (buf) => {
      return buf
    },
    [MEDIA_TYPE_DAG_JSON]: (buf) => {
      return buf
    },
    [MEDIA_TYPE_RAW]: (buf) => {
      return buf
    },
    [MEDIA_TYPE_OCTET_STREAM]: (buf) => {
      return buf
    }
  },
  [json.code]: {
    [MEDIA_TYPE_CBOR]: (buf) => {
      return buf
    },
    [MEDIA_TYPE_DAG_CBOR]: (buf) => {
      return dagCbor.encode(json.decode(buf))
    },
    [MEDIA_TYPE_JSON]: (buf) => {
      return buf
    },
    [MEDIA_TYPE_DAG_JSON]: (buf) => {
      return buf
    },
    [MEDIA_TYPE_RAW]: (buf) => {
      return buf
    },
    [MEDIA_TYPE_OCTET_STREAM]: (buf) => {
      return buf
    }
  },
  [dagPb.code]: {
    [MEDIA_TYPE_CBOR]: (buf) => {
      return buf
    },
    [MEDIA_TYPE_DAG_CBOR]: () => {
      throw new Error('Cannot perform conversion since IPIP-0524')
    },
    [MEDIA_TYPE_JSON]: (buf) => {
      return buf
    },
    [MEDIA_TYPE_DAG_JSON]: () => {
      throw new Error('Cannot perform conversion since IPIP-0524')
    },
    [MEDIA_TYPE_RAW]: (buf) => {
      return buf
    },
    [MEDIA_TYPE_OCTET_STREAM]: (buf) => {
      return buf
    }
  },
  [raw.code]: {
    [MEDIA_TYPE_CBOR]: (buf) => {
      return buf
    },
    [MEDIA_TYPE_DAG_CBOR]: (buf) => {
      throw new Error('Cannot perform conversion since IPIP-0524')
    },
    [MEDIA_TYPE_JSON]: (buf) => {
      return buf
    },
    [MEDIA_TYPE_DAG_JSON]: (buf) => {
      throw new Error('Cannot perform conversion since IPIP-0524')
    },
    [MEDIA_TYPE_RAW]: (buf) => {
      return buf
    },
    [MEDIA_TYPE_OCTET_STREAM]: (buf) => {
      return buf
    }
  },
  [identity.code]: {
    [MEDIA_TYPE_CBOR]: (buf) => {
      return buf
    },
    [MEDIA_TYPE_DAG_CBOR]: (buf) => {
      return dagCbor.encode(buf)
    },
    [MEDIA_TYPE_JSON]: (buf) => {
      return buf
    },
    [MEDIA_TYPE_DAG_JSON]: (buf) => {
      return dagJson.encode(buf)
    },
    [MEDIA_TYPE_RAW]: (buf) => {
      return buf
    },
    [MEDIA_TYPE_OCTET_STREAM]: (buf) => {
      return buf
    }
  }
}

export interface ConvertedOutput {
  block: Uint8Array
  contentType: string
}

/**
 * Where supported, deserialize the passed block using the codec appropriate for
 * the CID, then loop over the acceptable content types and attempt to convert
 * the deserialized value to that format and serialize it back to a block -
 * return the first successful result.
 */
export function convertOutput (cid: CID, block: Uint8Array, accept: AcceptHeader[]): { contentType: ContentType, output: Uint8Array } {
  if (accept.length === 0) {
    // return current format
    return {
      contentType: getContentTypesForCid(cid)[0],
      output: block
    }
  }

  for (const format of accept) {
    const converter = CONVERSIONS[cid.code]?.[format.contentType.mediaType]

    if (converter != null) {
      return {
        contentType: format.contentType,
        output: converter(block)
      }
    }
  }

  throw new Error(`Could not convert ${cid} to any of ${accept.map(a => a.contentType.mediaType).join(', ')}`)
}
