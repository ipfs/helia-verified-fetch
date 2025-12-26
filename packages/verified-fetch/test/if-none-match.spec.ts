import * as dagCbor from '@ipld/dag-cbor'
import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { CID } from 'multiformats'
import { sha256 } from 'multiformats/hashes/sha2'
import { VerifiedFetch } from '../src/verified-fetch.ts'
import { createHelia } from './fixtures/create-offline-helia.js'
import type { Helia } from 'helia'

describe('if-none-match', () => {
  let helia: Helia
  let verifiedFetch: VerifiedFetch

  beforeEach(async () => {
    helia = await createHelia()
    verifiedFetch = new VerifiedFetch(helia)
  })

  afterEach(async () => {
    await stop(helia, verifiedFetch)
  })

  it('should return a 304 if the etag matches', async () => {
    const obj = {
      hello: 'world',
      link: CID.parse('bafkqaddimvwgy3zao5xxe3debi')
    }
    const buf = dagCbor.encode(obj)
    const digest = await sha256.digest(buf)
    const cid = CID.createV1(dagCbor.code, digest)

    await helia.blockstore.put(cid, buf)

    const res = await verifiedFetch.fetch(`/ipfs/${cid}`)
    expect(res.status).to.equal(200)

    const res2 = await verifiedFetch.fetch(`/ipfs/${cid}`, {
      headers: {
        'if-none-match': `${res.headers.get('etag')}`
      }
    })
    expect(res2.status).to.equal(304)
    expect(res2.headers.get('cache-control')).to.equal(res.headers.get('cache-control'))
    expect(res2.headers.get('etag')).to.equal(res.headers.get('etag'))
  })

  it('should return a 200 if the etag does not match', async () => {
    const obj = {
      hello: 'world',
      link: CID.parse('bafkqaddimvwgy3zao5xxe3debi')
    }
    const buf = dagCbor.encode(obj)
    const digest = await sha256.digest(buf)
    const cid = CID.createV1(dagCbor.code, digest)

    await helia.blockstore.put(cid, buf)

    const res = await verifiedFetch.fetch(`/ipfs/${cid}`)
    expect(res.status).to.equal(200)

    const res2 = await verifiedFetch.fetch(`/ipfs/${cid}`, {
      headers: {
        'if-none-match': `${res.headers.get('etag')}-does-not-match`
      }
    })
    expect(res2.status).to.equal(200)
  })

  it('should return a 200 if the etag is empty', async () => {
    const obj = {
      hello: 'world',
      link: CID.parse('bafkqaddimvwgy3zao5xxe3debi')
    }
    const buf = dagCbor.encode(obj)
    const digest = await sha256.digest(buf)
    const cid = CID.createV1(dagCbor.code, digest)

    await helia.blockstore.put(cid, buf)

    const res = await verifiedFetch.fetch(`/ipfs/${cid}`)
    expect(res.status).to.equal(200)

    const res2 = await verifiedFetch.fetch(`/ipfs/${cid}`, {
      headers: {
        'if-none-match': '""'
      }
    })
    expect(res2.status).to.equal(200)
  })

  it('should return a 200 if the etag is empty and weak', async () => {
    const obj = {
      hello: 'world',
      link: CID.parse('bafkqaddimvwgy3zao5xxe3debi')
    }
    const buf = dagCbor.encode(obj)
    const digest = await sha256.digest(buf)
    const cid = CID.createV1(dagCbor.code, digest)

    await helia.blockstore.put(cid, buf)

    const res = await verifiedFetch.fetch(`/ipfs/${cid}`)
    expect(res.status).to.equal(200)

    const res2 = await verifiedFetch.fetch(`/ipfs/${cid}`, {
      headers: {
        'if-none-match': 'W/""'
      }
    })
    expect(res2.status).to.equal(200)
  })

  it('should return a 304 if the etag is a wildcard', async () => {
    const obj = {
      hello: 'world',
      link: CID.parse('bafkqaddimvwgy3zao5xxe3debi')
    }
    const buf = dagCbor.encode(obj)
    const digest = await sha256.digest(buf)
    const cid = CID.createV1(dagCbor.code, digest)

    await helia.blockstore.put(cid, buf)

    const res = await verifiedFetch.fetch(`/ipfs/${cid}`)
    expect(res.status).to.equal(200)

    const res2 = await verifiedFetch.fetch(`/ipfs/${cid}`, {
      headers: {
        'if-none-match': '*'
      }
    })
    expect(res2.status).to.equal(304)
  })

  it('should return a 304 if one of the etags match', async () => {
    const obj = {
      hello: 'world',
      link: CID.parse('bafkqaddimvwgy3zao5xxe3debi')
    }
    const buf = dagCbor.encode(obj)
    const digest = await sha256.digest(buf)
    const cid = CID.createV1(dagCbor.code, digest)

    await helia.blockstore.put(cid, buf)

    const res = await verifiedFetch.fetch(`/ipfs/${cid}`)
    expect(res.status).to.equal(200)

    const res2 = await verifiedFetch.fetch(`/ipfs/${cid}`, {
      headers: {
        'if-none-match': `"herp", "derp", ${res.headers.get('etag')}`
      }
    })
    expect(res2.status).to.equal(304)
  })

  it('should return a 304 for a block not in the blockstore when only requesting the block', async () => {
    const cid = 'bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise'
    const res = await verifiedFetch.fetch(`/ipfs/${cid}`, {
      headers: {
        'if-none-match': `"${cid}"`
      }
    })
    expect(res.status).to.equal(304)
    expect(res.headers.get('cache-control')).to.equal('public, max-age=29030400, immutable')
    expect(res.headers.get('etag')).to.equal(`"${cid}"`)
  })
})
