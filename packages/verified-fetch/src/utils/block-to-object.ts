import * as dagCbor from '@ipld/dag-cbor'
import * as dagJson from '@ipld/dag-json'
import * as cborg from 'cborg'
import * as json from 'multiformats/codecs/json'
import { CODEC_CBOR } from '../constants.ts'
import type { CID } from 'multiformats/cid'

const DECODERS: Record<number, (buf: Uint8Array) => any> = {
  [json.code]: json.decode,
  [dagJson.code]: dagJson.decode,
  [dagCbor.code]: dagCbor.decode,
  [CODEC_CBOR]: cborg.decode
}

export function blockToObject (cid: CID, block: Uint8Array): any {
  const decoder = DECODERS[cid.code]

  if (decoder == null) {
    throw new Error(`No decoder found for codec ${cid.code}`)
  }

  return decoder(block)
}

export function objectToJSON (obj: any): any {

}
