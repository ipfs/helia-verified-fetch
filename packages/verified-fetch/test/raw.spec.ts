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
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { VerifiedFetch } from '../src/verified-fetch.js'
import { createHelia } from './fixtures/create-offline-helia.js'
import type { Helia } from '@helia/interface'
import type { IPNSResolver } from '@helia/ipns'
import type { StubbedInstance } from 'sinon-ts'

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
  name: 'DAG-JSON',
  accept: 'application/vnd.ipld.dag-json',
  block: (obj) => {
    return uint8ArrayFromString(JSON.stringify(obj))
  },
  verify: async (obj, block, res) => {
    expect(res.headers.get('content-length')).to.equal('41')
    expect(await res.json()).to.deep.equal({
      '/': {
        bytes: uint8ArrayToString(block, 'base64')
      }
    })
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
}, {
  name: 'DAG-CBOR',
  accept: 'application/vnd.ipld.dag-cbor',
  block: (obj) => {
    return cborg.encode(obj)
  },
  verify: async (obj, block, res) => {
    expect(res.headers.get('content-length')).to.equal(cborg.encode(block).byteLength.toString())
    expect(cborg.decode(new Uint8Array(await res.arrayBuffer()))).to.deep.equal(cborg.encode(obj))
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
})
