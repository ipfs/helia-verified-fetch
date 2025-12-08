import { decode, encode } from 'cborg'
import { encode as jsonEncode } from 'cborg/json'
import { CID } from 'multiformats/cid'
import type { DecodeOptions } from 'cborg'

// https://github.com/ipfs/go-ipfs/issues/3570#issuecomment-273931692
const CID_CBOR_TAG = 42

const options: DecodeOptions = {
  allowIndefinite: false,
  coerceUndefinedToNull: false,
  allowNaN: false,
  allowInfinity: false,
  strict: true,
  useMaps: false,
  rejectDuplicateMapKeys: true,
  tags: [],

  // this is different to `DAG-CBOR` - the reason we disallow BigInts is
  // because we are about to re-encode to `JSON` which does not support
  // BigInts. Blocks containing large numbers should be deserialized using a
  // cbor decoder instead
  allowBigInt: false.valueOf
}

/**
 * Take a `DAG-CBOR` encoded `Uint8Array`, deserialize it as an object and
 * re-serialize it in a form that can be passed to `JSON.serialize` and then
 * `JSON.parse` without losing any data.
 */
export function dagCborToSafeJSON (buf: Uint8Array): Uint8Array {
  const opts: DecodeOptions = {
    ...options,
    tags: []
  }
  opts.tags[CID_CBOR_TAG] = (bytes: Uint8Array): any => {
    if (bytes[0] !== 0) {
      throw new Error('Invalid CID for CBOR tag 42; expected leading 0x00')
    }

    return {
      '/': CID.decode(bytes.subarray(1)).toString() // ignore leading 0x00
    }
  }

  const obj = decode(buf, opts)

  return jsonEncode(obj)
}

/**
 * Decode CBOR to object without CID tag support
 */
export function cborToObject (buf: Uint8Array): any {
  return decode(buf, options)
}

/**
 * Decode CBOR to object without CID tag support
 */
export function objectToCbor (obj: any): Uint8Array {
  return encode(obj, options)
}
