import { decode } from 'cborg'
import { encode } from 'cborg/json'

/**
 * Take a `DAG-CBOR` encoded `Uint8Array`, deserialize it as an object and
 * re-serialize it in a form that can be passed to `JSON.serialize` and then
 * `JSON.parse` without losing any data.
 */
export function dagCborToSafeJSON (buf: Uint8Array): string {
  const obj = decode(buf, {
    allowIndefinite: false,
    coerceUndefinedToNull: false,
    allowNaN: false,
    allowInfinity: false,
    strict: true,
    useMaps: false,
    rejectDuplicateMapKeys: true,

    // this is different to `DAG-CBOR` - the reason we disallow BigInts is
    // because we are about to re-encode to `JSON` which does not support
    // BigInts. Blocks containing large numbers should be deserialized using a
    // cbor decoder instead
    allowBigInt: false
  })

  return new TextDecoder().decode(encode(obj))
}
