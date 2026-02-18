import * as dagCbor from '@ipld/dag-cbor'
import * as dagJson from '@ipld/dag-json'
import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { CID } from 'multiformats'
import { sha256 } from 'multiformats/hashes/sha2'
import { MEDIA_TYPE_CBOR, MEDIA_TYPE_DAG_CBOR, MEDIA_TYPE_DAG_JSON, MEDIA_TYPE_JSON, MEDIA_TYPE_OCTET_STREAM, MEDIA_TYPE_RAW } from '../src/index.ts'
import { VerifiedFetch } from '../src/verified-fetch.ts'
import { createHelia } from './fixtures/create-offline-helia.js'
import type { Helia } from 'helia'

describe('dag-cbor', () => {
  let helia: Helia
  let verifiedFetch: VerifiedFetch

  beforeEach(async () => {
    helia = await createHelia()
    verifiedFetch = new VerifiedFetch(helia)
  })

  afterEach(async () => {
    await stop(helia, verifiedFetch)
  })

  it('should download DAG-CBOR blocks as application/vnd.ipld.dag-cbor by default', async () => {
    const obj = {
      hello: 'world',
      link: CID.parse('bafkqaddimvwgy3zao5xxe3debi')
    }
    const block = dagCbor.encode(obj)
    const digest = await sha256.digest(block)
    const cid = CID.createV1(dagCbor.code, digest)

    await helia.blockstore.put(cid, block)

    const res = await verifiedFetch.fetch(`/ipfs/${cid}`)
    expect(res.ok).to.be.true()
    expect(res.headers.get('content-type')).to.equal(MEDIA_TYPE_DAG_CBOR)
    expect(res.headers.get('cache-control')).to.equal('public, max-age=29030400, immutable')

    const body = await res.arrayBuffer()
    const decoded = dagCbor.decode(new Uint8Array(body))

    expect(decoded).to.deep.equal(obj)
  })

  it('can download DAG-CBOR blocks as application/octet-stream', async () => {
    const obj = {
      hello: 'world',
      link: CID.parse('bafkqaddimvwgy3zao5xxe3debi')
    }
    const block = dagCbor.encode(obj)
    const digest = await sha256.digest(block)
    const cid = CID.createV1(dagCbor.code, digest)

    await helia.blockstore.put(cid, block)

    const res = await verifiedFetch.fetch(`/ipfs/${cid}`, {
      headers: {
        accept: MEDIA_TYPE_OCTET_STREAM
      }
    })
    expect(res.ok).to.be.true()
    expect(res.headers.get('content-type')).to.equal('application/octet-stream')
    expect(res.headers.get('cache-control')).to.equal('public, max-age=29030400, immutable')

    const body = await res.arrayBuffer()
    const decoded = dagCbor.decode(new Uint8Array(body))

    expect(decoded).to.deep.equal(obj)
  })

  it('can download DAG-CBOR blocks as raw', async () => {
    const obj = {
      hello: 'world',
      link: CID.parse('bafkqaddimvwgy3zao5xxe3debi')
    }
    const block = dagCbor.encode(obj)
    const digest = await sha256.digest(block)
    const cid = CID.createV1(dagCbor.code, digest)

    await helia.blockstore.put(cid, block)

    const res = await verifiedFetch.fetch(`/ipfs/${cid}`, {
      headers: {
        accept: MEDIA_TYPE_RAW
      }
    })
    expect(res.ok).to.be.true()
    expect(res.headers.get('content-type')).to.equal('application/vnd.ipld.raw')
    expect(res.headers.get('cache-control')).to.equal('public, max-age=29030400, immutable')

    const body = await res.arrayBuffer()
    const decoded = dagCbor.decode(new Uint8Array(body))

    expect(decoded).to.deep.equal(obj)
  })

  it('can download DAG-CBOR blocks as CBOR', async () => {
    const obj = {
      hello: 'world',
      link: CID.parse('bafkqaddimvwgy3zao5xxe3debi')
    }
    const block = dagCbor.encode(obj)
    const digest = await sha256.digest(block)
    const cid = CID.createV1(dagCbor.code, digest)

    await helia.blockstore.put(cid, block)

    const res = await verifiedFetch.fetch(`/ipfs/${cid}`, {
      headers: {
        accept: MEDIA_TYPE_CBOR
      }
    })
    expect(res.ok).to.be.true()
    expect(res.headers.get('content-type')).to.equal('application/cbor')
    expect(res.headers.get('cache-control')).to.equal('public, max-age=29030400, immutable')

    const body = await res.arrayBuffer()
    const decoded = dagCbor.decode(new Uint8Array(body))

    expect(decoded).to.deep.equal(obj)
  })

  it('can download DAG-CBOR blocks as JSON', async () => {
    const obj = {
      hello: 'world',
      link: CID.parse('bafkqaddimvwgy3zao5xxe3debi')
    }
    const block = dagCbor.encode(obj)
    const digest = await sha256.digest(block)
    const cid = CID.createV1(dagCbor.code, digest)

    await helia.blockstore.put(cid, block)

    const res = await verifiedFetch.fetch(`/ipfs/${cid}`, {
      headers: {
        accept: MEDIA_TYPE_JSON
      }
    })
    expect(res.ok).to.be.true()
    expect(res.headers.get('content-type')).to.equal('application/json')
    expect(res.headers.get('cache-control')).to.equal('public, max-age=29030400, immutable')

    const body = await res.arrayBuffer()
    const decoded = dagJson.decode(new Uint8Array(body))

    expect(decoded).to.deep.equal(obj)
  })

  it('can not download DAG-CBOR blocks as DAG-JSON', async () => {
    const obj = {
      hello: 'world',
      link: CID.parse('bafkqaddimvwgy3zao5xxe3debi')
    }
    const block = dagCbor.encode(obj)
    const digest = await sha256.digest(block)
    const cid = CID.createV1(dagCbor.code, digest)

    await helia.blockstore.put(cid, block)

    const res = await verifiedFetch.fetch(`/ipfs/${cid}`, {
      headers: {
        accept: MEDIA_TYPE_DAG_JSON
      }
    })
    expect(res.status).to.equal(406)
  })
})
