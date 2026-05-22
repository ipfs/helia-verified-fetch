import { dagCbor } from '@helia/dag-cbor'
import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import * as cborg from 'cborg'
import toBuffer from 'it-to-buffer'
import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { MEDIA_TYPE_DAG_CBOR, MEDIA_TYPE_DAG_JSON, MEDIA_TYPE_OCTET_STREAM, MEDIA_TYPE_RAW } from '../src/index.ts'
import { VerifiedFetch } from '../src/verified-fetch.ts'
import { createHelia } from './fixtures/create-offline-helia.ts'
import type { Helia } from '@helia/interface'
import type { IPNSResolver } from '@helia/ipns'
import type { StubbedInstance } from 'sinon-ts'

const PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82
])

const PDF_BYTES = Uint8Array.from([
  // %PDF-1.4 header followed by minimal valid-ish content for file-type sniffing
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34,
  0x0a, 0x25, 0xc4, 0xe5, 0xf2, 0xe5, 0xeb, 0xa7,
  0xf3, 0xa0, 0xd0, 0xc4, 0xc6, 0x0a
])

// Minimal JPEG: SOI + APP0/JFIF + EOI
const JPEG_BYTES = Uint8Array.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
  0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
  0x00, 0x01, 0x00, 0x00, 0xff, 0xd9
])

// Minimal MP4 ftyp box (ISO base media, brand "isom")
const MP4_BYTES = Uint8Array.from([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70,
  0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x00, 0x00,
  0x69, 0x73, 0x6f, 0x6d, 0x6d, 0x70, 0x34, 0x31
])

// EBML header announcing the matroska/webm DocType
const WEBM_BYTES = Uint8Array.from([
  0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81,
  0x01, 0x42, 0xf7, 0x81, 0x01, 0x42, 0xf2, 0x81,
  0x04, 0x42, 0xf3, 0x81, 0x08, 0x42, 0x82, 0x84,
  0x77, 0x65, 0x62, 0x6d, 0x42, 0x87, 0x81, 0x02,
  0x42, 0x85, 0x81, 0x02
])

interface Format {
  name: string
  accept: string
  block (obj: any): Uint8Array
  verify (obj: any, block: Uint8Array, response: Response): Promise<void>
}

const FORMATS: Format[] = [{
  name: 'JSON',
  accept: 'application/json',
  block: (obj) => {
    return uint8ArrayFromString(JSON.stringify(obj))
  },
  verify: async (obj, block, res) => {
    expect(res.headers.get('content-length')).to.equal('17')
    expect(new Uint8Array(await res.arrayBuffer())).to.equalBytes(block)
  }
}, {
  name: 'CBOR',
  accept: 'application/cbor',
  block: (obj) => {
    return cborg.encode(obj)
  },
  verify: async (obj, block, res) => {
    expect(res.headers.get('content-length')).to.equal(block.byteLength.toString())
    expect(new Uint8Array(await res.arrayBuffer())).to.equalBytes(block)
  }
}]

describe('raw blocks', () => {
  let helia: Helia
  let ipnsResolver: StubbedInstance<IPNSResolver>
  let verifiedFetch: VerifiedFetch

  beforeEach(async () => {
    helia = await createHelia()
    ipnsResolver = stubInterface()
    verifiedFetch = new VerifiedFetch(helia, {
      ipnsResolver
    })
  })

  afterEach(async () => {
    await stop(helia, verifiedFetch)
  })

  it('should support fetching a raw block', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)
    const block = await toBuffer(helia.blockstore.get(cid))

    const res = await verifiedFetch.fetch(`ipfs://${cid}`, {
      headers: {
        accept: 'application/vnd.ipld.raw'
      }
    })
    expect(res.status).to.equal(200)
    expect(res.headers.get('content-type')).to.equal('application/vnd.ipld.raw')
    expect(res.headers.get('content-length')).to.equal(block.byteLength.toString())
    expect(res.headers.get('x-ipfs-roots')).to.equal(cid.toV1().toString())
    expect(res.headers.get('cache-control')).to.equal('public, max-age=29030400, immutable')

    const buf = new Uint8Array(await res.arrayBuffer())
    expect(buf).to.equalBytes(block)
  })

  it('should support fetching a raw block of an unsupported codec as raw', async () => {
    const block = Uint8Array.from([0, 1, 2, 3, 4])
    const digest = await sha256.digest(block)
    // zcash-block, unsupported by default configuration
    const cid = CID.createV1(0xc0, digest)
    await helia.blockstore.put(cid, block)

    const res = await verifiedFetch.fetch(`ipfs://${cid}`, {
      headers: {
        accept: 'application/vnd.ipld.raw'
      }
    })
    expect(res.status).to.equal(200)
    expect(res.headers.get('content-type')).to.equal('application/vnd.ipld.raw')
    expect(res.headers.get('content-length')).to.equal(block.byteLength.toString())
    expect(res.headers.get('x-ipfs-roots')).to.equal(cid.toV1().toString())
    expect(res.headers.get('cache-control')).to.equal('public, max-age=29030400, immutable')

    const buf = new Uint8Array(await res.arrayBuffer())
    expect(buf).to.equalBytes(block)
  })

  it('should support fetching a raw block of an unsupported codec as octet-stream', async () => {
    const block = Uint8Array.from([0, 1, 2, 3, 4])
    const digest = await sha256.digest(block)
    // zcash-block, unsupported by default configuration
    const cid = CID.createV1(0xc0, digest)
    await helia.blockstore.put(cid, block)

    const res = await verifiedFetch.fetch(`ipfs://${cid}`, {
      headers: {
        accept: 'application/octet-stream'
      }
    })
    expect(res.status).to.equal(200)
    expect(res.headers.get('content-type')).to.equal('application/octet-stream')
    expect(res.headers.get('content-length')).to.equal(block.byteLength.toString())
    expect(res.headers.get('x-ipfs-roots')).to.equal(cid.toV1().toString())
    expect(res.headers.get('cache-control')).to.equal('public, max-age=29030400, immutable')

    const buf = new Uint8Array(await res.arrayBuffer())
    expect(buf).to.equalBytes(block)
  })

  for (const format of FORMATS) {
    // eslint-disable-next-line no-loop-func
    it(`should support fetching a raw block as ${format.name}`, async () => {
      const obj = {
        hello: 'world'
      }
      const block = format.block(obj)
      const hash = await sha256.digest(block)
      const cid = CID.createV1(raw.code, hash)
      await helia.blockstore.put(cid, block)

      const res = await verifiedFetch.fetch(`ipfs://${cid}`, {
        headers: {
          accept: format.accept
        }
      })
      expect(res.status).to.equal(200)
      expect(res.headers.get('content-type')).to.equal(format.accept)
      expect(res.headers.get('x-ipfs-roots')).to.equal(cid.toV1().toString())
      expect(res.headers.get('cache-control')).to.equal('public, max-age=29030400, immutable')

      await format.verify(obj, block, res)
    })
  }

  it('should not support fetching a raw block as DAG-CBOR', async () => {
    const block = Uint8Array.from([0, 1, 2, 3, 4])
    const hash = await sha256.digest(block)
    const cid = CID.createV1(raw.code, hash)
    await helia.blockstore.put(cid, block)

    const res = await verifiedFetch.fetch(`ipfs://${cid}`, {
      headers: {
        accept: MEDIA_TYPE_DAG_CBOR
      }
    })
    expect(res.status).to.equal(406)
  })

  it('should not support fetching a raw block as DAG-JSON', async () => {
    const block = Uint8Array.from([0, 1, 2, 3, 4])
    const hash = await sha256.digest(block)
    const cid = CID.createV1(raw.code, hash)
    await helia.blockstore.put(cid, block)

    const res = await verifiedFetch.fetch(`ipfs://${cid}`, {
      headers: {
        accept: MEDIA_TYPE_DAG_JSON
      }
    })
    expect(res.status).to.equal(406)
  })

  // codec 0xc0 is zcash-block, which UnixFS and IPLD ignore, so the block falls through to plugin-handle-raw.
  describe('content-type sniffing (path-gateway spec §3.2.4)', () => {
    async function putUnsupportedCodecBlock (block: Uint8Array): Promise<CID> {
      const digest = await sha256.digest(block)
      const cid = CID.createV1(0xc0, digest)
      await helia.blockstore.put(cid, block)
      return cid
    }

    it('sniffs PNG bytes when no Accept is set', async () => {
      const cid = await putUnsupportedCodecBlock(PNG_BYTES)

      const res = await verifiedFetch.fetch(`ipfs://${cid}`)
      expect(res.status).to.equal(200)
      expect(res.headers.get('content-type')).to.equal('image/png')
      expect(res.headers.get('content-length')).to.equal(PNG_BYTES.byteLength.toString())

      const buf = new Uint8Array(await res.arrayBuffer())
      expect(buf).to.equalBytes(PNG_BYTES)
    })

    it('sniffs PDF bytes when no Accept is set', async () => {
      const cid = await putUnsupportedCodecBlock(PDF_BYTES)

      const res = await verifiedFetch.fetch(`ipfs://${cid}`)
      expect(res.status).to.equal(200)
      expect(res.headers.get('content-type')).to.equal('application/pdf')

      const buf = new Uint8Array(await res.arrayBuffer())
      expect(buf).to.equalBytes(PDF_BYTES)
    })

    it('sniffs JPEG bytes when no Accept is set', async () => {
      const cid = await putUnsupportedCodecBlock(JPEG_BYTES)

      const res = await verifiedFetch.fetch(`ipfs://${cid}`)
      expect(res.status).to.equal(200)
      expect(res.headers.get('content-type')).to.equal('image/jpeg')
    })

    it('sniffs MP4 bytes when no Accept is set', async () => {
      const cid = await putUnsupportedCodecBlock(MP4_BYTES)

      const res = await verifiedFetch.fetch(`ipfs://${cid}`)
      expect(res.status).to.equal(200)
      expect(res.headers.get('content-type')).to.equal('video/mp4')
    })

    it('sniffs WebM bytes when no Accept is set', async () => {
      const cid = await putUnsupportedCodecBlock(WEBM_BYTES)

      const res = await verifiedFetch.fetch(`ipfs://${cid}`)
      expect(res.status).to.equal(200)
      expect(res.headers.get('content-type')).to.equal('video/webm')
    })

    it('sniffs JSON bytes when no Accept is set', async () => {
      const block = uint8ArrayFromString('{"hello":"world"}')
      const cid = await putUnsupportedCodecBlock(block)

      const res = await verifiedFetch.fetch(`ipfs://${cid}`)
      expect(res.status).to.equal(200)
      expect(res.headers.get('content-type')).to.equal('application/json')
    })

    it('sniffs plain text bytes when no Accept is set', async () => {
      const block = uint8ArrayFromString('hello from a text file')
      const cid = await putUnsupportedCodecBlock(block)

      const res = await verifiedFetch.fetch(`ipfs://${cid}`)
      expect(res.status).to.equal(200)
      expect(res.headers.get('content-type')).to.equal('text/plain; charset=utf-8')
    })

    it('keeps application/vnd.ipld.raw when contentTypeParser cannot classify the bytes', async () => {
      const block = uint8ArrayFromString('hello')
      const cid = await putUnsupportedCodecBlock(block)

      const customFetch = new VerifiedFetch(helia, {
        ipnsResolver,
        // simulate a parser that cannot identify the bytes
        contentTypeParser: () => undefined
      })

      try {
        const res = await customFetch.fetch(`ipfs://${cid}`)
        expect(res.status).to.equal(200)
        expect(res.headers.get('content-type')).to.equal(MEDIA_TYPE_RAW)
      } finally {
        await stop(customFetch)
      }
    })

    it('returns application/vnd.ipld.raw when explicitly requested even for PNG bytes', async () => {
      const cid = await putUnsupportedCodecBlock(PNG_BYTES)

      const res = await verifiedFetch.fetch(`ipfs://${cid}`, {
        headers: { accept: MEDIA_TYPE_RAW }
      })
      expect(res.status).to.equal(200)
      expect(res.headers.get('content-type')).to.equal(MEDIA_TYPE_RAW)

      const buf = new Uint8Array(await res.arrayBuffer())
      expect(buf).to.equalBytes(PNG_BYTES)
    })

    it('returns application/octet-stream when explicitly requested even for PNG bytes', async () => {
      const cid = await putUnsupportedCodecBlock(PNG_BYTES)

      const res = await verifiedFetch.fetch(`ipfs://${cid}`, {
        headers: { accept: MEDIA_TYPE_OCTET_STREAM }
      })
      expect(res.status).to.equal(200)
      expect(res.headers.get('content-type')).to.equal(MEDIA_TYPE_OCTET_STREAM)

      const buf = new Uint8Array(await res.arrayBuffer())
      expect(buf).to.equalBytes(PNG_BYTES)
    })
  })
})
