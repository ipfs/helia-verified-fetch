import * as dagCbor from '@ipld/dag-cbor'
import * as dagJson from '@ipld/dag-json'
import { expect } from 'aegir/chai'
import { CID } from 'multiformats/cid'
import * as json from 'multiformats/codecs/json'
import * as raw from 'multiformats/codecs/raw'
import { CODEC_CBOR } from '../../src/constants.ts'
import { CONTENT_TYPE_CBOR, CONTENT_TYPE_DAG_CBOR, CONTENT_TYPE_DAG_JSON, CONTENT_TYPE_JSON, CONTENT_TYPE_OCTET_STREAM, CONTENT_TYPE_RAW } from '../../src/utils/content-types.ts'

export interface Codec {
  name: string
  code: number
  mediaType: string,
  encoded(): Uint8Array
  decode(buf: Uint8Array): void
}

export interface CodecTranslation {
  ok: boolean
  input: Codec
  output: Codec
}

const fixtureWithCID = {
  hello: 'world',
  link: CID.parse('bafkqaddimvwgy3zao5xxe3debi')
}

const fixtureWithoutCID = {
  hello: 'world',
  link: {
    '/': 'bafkqaddimvwgy3zao5xxe3debi'
  }
}

export const RAW: Codec = {
  name: 'RAW',
  code: raw.code,
  mediaType: CONTENT_TYPE_RAW.mediaType,
  encoded () {
    return json.encode(fixtureWithoutCID)
  },
  decode (buf) {
    expect(json.decode(buf)).to.deep.equal(fixtureWithoutCID)
  }
}

export const OCTET_STREAM: Codec = {
  name: 'OCTET_STREAM',
  code: raw.code,
  mediaType: CONTENT_TYPE_OCTET_STREAM.mediaType,
  encoded () {
    return json.encode(fixtureWithoutCID)
  },
  decode (buf) {
    expect(json.decode(buf)).to.deep.equal(fixtureWithoutCID)
  }
}

export const CBOR: Codec = {
  name: 'CBOR',
  code: CODEC_CBOR,
  mediaType: CONTENT_TYPE_CBOR.mediaType,
  encoded () {
    return dagCbor.encode(fixtureWithoutCID)
  },
  decode (buf) {
    expect(dagCbor.decode(buf)).to.deep.equal(fixtureWithoutCID)
  }
}

export const DAG_CBOR: Codec = {
  name: 'DAG-CBOR',
  code: dagCbor.code,
  mediaType: CONTENT_TYPE_DAG_CBOR.mediaType,
  encoded () {
    return dagCbor.encode(fixtureWithCID)
  },
  decode (buf) {
    expect(dagCbor.decode(buf)).to.deep.equal(fixtureWithCID)
  }
}

export const JSON: Codec = {
  name: 'JSON',
  code: json.code,
  mediaType: CONTENT_TYPE_JSON.mediaType,
  encoded () {
    return json.encode(fixtureWithoutCID)
  },
  decode (buf) {
    expect(json.decode(buf)).to.deep.equal(fixtureWithoutCID)
  }
}

export const DAG_JSON: Codec = {
  name: 'DAG-JSON',
  code: dagJson.code,
  mediaType: CONTENT_TYPE_DAG_JSON.mediaType,
  encoded () {
    return dagJson.encode(fixtureWithCID)
  },
  decode (buf) {
    expect(dagJson.decode(buf)).to.deep.equal(fixtureWithCID)
  }
}

export const CBOR_TRANSLATIONS: CodecTranslation[] = [{
  ok: true,
  input: CBOR,
  output: CBOR
}, {
  ok: false,
  input: CBOR,
  output: DAG_CBOR
}, {
  ok: false,
  input: CBOR,
  output: JSON
}, {
  ok: false,
  input: CBOR,
  output: DAG_JSON
}, {
  ok: true,
  input: CBOR,
  output: RAW
}, {
  ok: true,
  input: CBOR,
  output: OCTET_STREAM
}]

export const DAG_CBOR_TRANSLATIONS: CodecTranslation[] = [{
  ok: true,
  input: DAG_CBOR,
  output: CBOR
}, {
  ok: true,
  input: DAG_CBOR,
  output: DAG_CBOR
}, {
  ok: false,
  input: DAG_CBOR,
  output: JSON
}, {
  ok: false,
  input: DAG_CBOR,
  output: DAG_JSON
}, {
  ok: true,
  input: DAG_CBOR,
  output: RAW
}, {
  ok: true,
  input: DAG_CBOR,
  output: OCTET_STREAM
}]

export const JSON_TRANSLATIONS: CodecTranslation[] = [{
  ok: false,
  input: JSON,
  output: CBOR
}, {
  ok: false,
  input: JSON,
  output: DAG_CBOR
}, {
  ok: true,
  input: JSON,
  output: JSON
}, {
  ok: false,
  input: JSON,
  output: DAG_JSON
}, {
  ok: true,
  input: JSON,
  output: RAW
}, {
  ok: true,
  input: JSON,
  output: OCTET_STREAM
}]

export const DAG_JSON_TRANSLATIONS: CodecTranslation[] = [{
  ok: false,
  input: DAG_JSON,
  output: CBOR
}, {
  ok: false,
  input: DAG_JSON,
  output: DAG_CBOR
}, {
  ok: true,
  input: DAG_JSON,
  output: JSON
}, {
  ok: true,
  input: DAG_JSON,
  output: DAG_JSON
}, {
  ok: true,
  input: DAG_JSON,
  output: RAW
}, {
  ok: true,
  input: DAG_JSON,
  output: OCTET_STREAM
}]
