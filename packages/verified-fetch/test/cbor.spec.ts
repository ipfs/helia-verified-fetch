import * as dagCbor from '@ipld/dag-cbor'
import * as dagJson from '@ipld/dag-json'
import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import * as cbor from 'cborg'
import { CID } from 'multiformats'
import * as json from 'multiformats/codecs/json'
import { sha256 } from 'multiformats/hashes/sha2'
import { CODEC_CBOR } from '../src/constants.ts'
import { VerifiedFetch } from '../src/verified-fetch.ts'
import { createHelia } from './fixtures/create-offline-helia.js'
import type { Helia } from 'helia'

describe('cbor', () => {
  let helia: Helia
  let verifiedFetch: VerifiedFetch

  beforeEach(async () => {
    helia = await createHelia({
      codecs: [{
        name: 'cbor',
        code: CODEC_CBOR,
        encode: (d) => cbor.encode(d),
        decode: (b: any) => cbor.decode(b)
      }]
    })
    verifiedFetch = new VerifiedFetch(helia)
  })

  afterEach(async () => {
    await stop(helia, verifiedFetch)
  })

  it('should download CBOR blocks as application/cbor by default', async () => {
    const obj = {
      hello: 'world'
    }
    const buf = cbor.encode(obj)
    const digest = await sha256.digest(buf)
    const cid = CID.createV1(CODEC_CBOR, digest)

    await helia.blockstore.put(cid, buf)

    const res = await verifiedFetch.fetch(`/ipfs/${cid}`)
    expect(res.ok).to.be.true()
    expect(res.headers.get('content-type')).to.equal('application/cbor')

    const body = await res.arrayBuffer()
    const decoded = cbor.decode(new Uint8Array(body))

    expect(decoded).to.deep.equal(obj)
  })

  it('can download CBOR blocks as application/octet-stream', async () => {
    const obj = {
      hello: 'world'
    }
    const buf = cbor.encode(obj)
    const digest = await sha256.digest(buf)
    const cid = CID.createV1(CODEC_CBOR, digest)

    await helia.blockstore.put(cid, buf)

    const res = await verifiedFetch.fetch(`/ipfs/${cid}`, {
      headers: {
        accept: 'application/octet-stream'
      }
    })
    expect(res.ok).to.be.true()
    expect(res.headers.get('content-type')).to.equal('application/octet-stream')

    const body = await res.arrayBuffer()
    const decoded = cbor.decode(new Uint8Array(body))

    expect(decoded).to.deep.equal(obj)
  })

  it('can download CBOR blocks as raw', async () => {
    const obj = {
      hello: 'world'
    }
    const buf = cbor.encode(obj)
    const digest = await sha256.digest(buf)
    const cid = CID.createV1(CODEC_CBOR, digest)

    await helia.blockstore.put(cid, buf)

    const res = await verifiedFetch.fetch(`/ipfs/${cid}`, {
      headers: {
        accept: 'application/vnd.ipld.raw'
      }
    })
    expect(res.ok).to.be.true()
    expect(res.headers.get('content-type')).to.equal('application/vnd.ipld.raw')

    const body = await res.arrayBuffer()
    const decoded = cbor.decode(new Uint8Array(body))

    expect(decoded).to.deep.equal(obj)
  })

  it('can download CBOR blocks as CBOR', async () => {
    const obj = {
      hello: 'world'
    }
    const buf = cbor.encode(obj)
    const digest = await sha256.digest(buf)
    const cid = CID.createV1(CODEC_CBOR, digest)

    await helia.blockstore.put(cid, buf)

    const res = await verifiedFetch.fetch(`/ipfs/${cid}`, {
      headers: {
        accept: 'application/cbor'
      }
    })
    expect(res.ok).to.be.true()
    expect(res.headers.get('content-type')).to.equal('application/cbor')

    const body = await res.arrayBuffer()
    const decoded = cbor.decode(new Uint8Array(body))

    expect(decoded).to.deep.equal(obj)
  })

  it('can download CBOR blocks as JSON', async () => {
    const obj = {
      hello: 'world'
    }
    const buf = cbor.encode(obj)
    const digest = await sha256.digest(buf)
    const cid = CID.createV1(CODEC_CBOR, digest)

    await helia.blockstore.put(cid, buf)

    const res = await verifiedFetch.fetch(`/ipfs/${cid}`, {
      headers: {
        accept: 'application/json'
      }
    })
    expect(res.ok).to.be.true()
    expect(res.headers.get('content-type')).to.equal('application/json')

    const body = await res.arrayBuffer()
    const decoded = json.decode(new Uint8Array(body))

    expect(decoded).to.deep.equal(obj)
  })

  it('can download CBOR blocks as DAG-CBOR', async () => {
    const obj = {
      hello: 'world',
      link: CID.parse('bafkqaddimvwgy3zao5xxe3debi')
    }
    const buf = dagCbor.encode(obj)
    const digest = await sha256.digest(buf)
    const cid = CID.createV1(CODEC_CBOR, digest)

    await helia.blockstore.put(cid, buf)

    const res = await verifiedFetch.fetch(`/ipfs/${cid}`, {
      headers: {
        accept: 'application/vnd.ipld.dag-cbor'
      }
    })
    expect(res.ok).to.be.true()
    expect(res.headers.get('content-type')).to.equal('application/vnd.ipld.dag-cbor')

    const body = await res.arrayBuffer()
    const decoded = dagCbor.decode(new Uint8Array(body))

    expect(decoded).to.deep.equal({
      hello: 'world',
      link: CID.parse('bafkqaddimvwgy3zao5xxe3debi')
    })
  })

  it('can download CBOR blocks as DAG-JSON', async () => {
    const obj = {
      hello: 'world',
      link: {
        '/': 'bafkqaddimvwgy3zao5xxe3debi'
      }
    }
    const buf = cbor.encode(obj)
    const digest = await sha256.digest(buf)
    const cid = CID.createV1(CODEC_CBOR, digest)

    await helia.blockstore.put(cid, buf)

    const res = await verifiedFetch.fetch(`/ipfs/${cid}`, {
      headers: {
        accept: 'application/vnd.ipld.dag-json'
      }
    })
    expect(res.ok).to.be.true()
    expect(res.headers.get('content-type')).to.equal('application/vnd.ipld.dag-json')

    const body = await res.arrayBuffer()
    const decoded = dagJson.decode(new Uint8Array(body))
    expect(decoded).to.deep.equal({
      hello: 'world',
      link: CID.parse('bafkqaddimvwgy3zao5xxe3debi')
    })
  })
})
