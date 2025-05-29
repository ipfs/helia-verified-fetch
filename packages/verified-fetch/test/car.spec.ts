import { car } from '@helia/car'
import { dagCbor } from '@helia/dag-cbor'
import { CarReader } from '@ipld/car'
import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import itAll from 'it-all'
import { VerifiedFetch } from '../src/verified-fetch.js'
import { createHelia } from './fixtures/create-offline-helia.js'
import { memoryCarWriter } from './fixtures/memory-car.js'
import type { MemoryCar } from './fixtures/memory-car.js'
import type { Helia } from '@helia/interface'
import type { CID } from 'multiformats/cid'

describe('car files', () => {
  let helia: Helia
  let verifiedFetch: VerifiedFetch

  beforeEach(async () => {
    helia = await createHelia()
    verifiedFetch = new VerifiedFetch({
      helia
    })
  })

  afterEach(async () => {
    await stop(helia, verifiedFetch)
  })

  it('should support fetching a CAR file', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const ca = car(helia)
    const writer = memoryCarWriter(cid)
    await ca.export(cid, writer)

    const resp = await verifiedFetch.fetch(cid, {
      headers: {
        accept: 'application/vnd.ipld.car'
      }
    })
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('content-type')).to.equal('application/vnd.ipld.car; version=1')
    expect(resp.headers.get('content-disposition')).to.equal(`attachment; filename="${cid.toString()}.car"`)
    const buf = new Uint8Array(await resp.arrayBuffer())

    expect(buf).to.equalBytes(await writer.bytes())
  })

  it('should support specifying a filename for a CAR file', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const ca = car(helia)
    const writer = memoryCarWriter(cid)
    await ca.export(cid, writer)

    const resp = await verifiedFetch.fetch(`ipfs://${cid}?filename=foo.bar`, {
      headers: {
        accept: 'application/vnd.ipld.car'
      }
    })
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('content-type')).to.equal('application/vnd.ipld.car; version=1')
    expect(resp.headers.get('content-disposition')).to.equal('attachment; filename="foo.bar"')
  })

  describe('dag-scope cbor', () => {
    let cid: CID
    let nestedCid1: CID
    let nestedCid2: CID
    let writer: MemoryCar
    let helia: Helia
    let verifiedFetch: VerifiedFetch

    after(async () => {
      await stop(helia, verifiedFetch)
    })
    before(async () => {
      helia = await createHelia()
      verifiedFetch = new VerifiedFetch({
        helia
      })

      const c = dagCbor(helia)
      nestedCid1 = await c.add({
        data: 'some data'
      })
      nestedCid2 = await c.add({
        data: 'some other data'
      })
      const obj = {
        x: 1,
        /* CID instances are encoded as links */
        y: [2, 3, nestedCid1],
        z: {
          a: nestedCid2,
          b: null,
          c: 'string'
        }
      }

      cid = await c.add(obj)

      const ca = car(helia)
      writer = memoryCarWriter(cid)

      await ca.export(cid, writer)
    })

    it('dag-scope=all returns all blocks', async () => {
      const allResp = await verifiedFetch.fetch(`ipfs://${cid}?format=car&dag-scope=all`)

      expect(allResp.status).to.equal(200)
      expect(allResp.headers.get('content-type')).to.equal('application/vnd.ipld.car; version=1')
      expect(allResp.headers.get('content-disposition')).to.equal(`attachment; filename="${cid.toString()}.car"`)
      const buf = new Uint8Array(await allResp.arrayBuffer())

      const allScopeReader = await CarReader.fromBytes(buf)

      expect(await allScopeReader.getRoots()).to.deep.equal([cid])
      expect(await itAll(allScopeReader.cids())).to.deep.equal([cid, nestedCid1, nestedCid2])
      expect(await itAll(allScopeReader.blocks())).to.have.lengthOf(3)

      expect(buf).to.equalBytes(await writer.bytes())
    })

    it('dag-scope=block returns only the nested block - plus verification/root block', async () => {
      const blockResp = await verifiedFetch.fetch(`ipfs://${cid}/z/a?format=car&dag-scope=block`)

      expect(blockResp.status).to.equal(200)
      expect(blockResp.headers.get('content-type')).to.equal('application/vnd.ipld.car; version=1')
      expect(blockResp.headers.get('content-disposition')).to.equal(`attachment; filename="${cid.toString()}_z_a.car"`)
      const blockBuf = new Uint8Array(await blockResp.arrayBuffer())

      const blockScopeReader = await CarReader.fromBytes(blockBuf)

      expect(await blockScopeReader.getRoots()).to.deep.equal([nestedCid2])
      // duplicates are not removed
      expect(await itAll(blockScopeReader.cids())).to.deep.equal([cid, cid, nestedCid2])
      expect(await itAll(blockScopeReader.blocks())).to.have.lengthOf(3)
    })

    it('dag-scope=entity returns only the root block', async () => {
      const entityResp = await verifiedFetch.fetch(`ipfs://${cid}/z?format=car&dag-scope=entity`)

      expect(entityResp.status).to.equal(200)
      expect(entityResp.headers.get('content-type')).to.equal('application/vnd.ipld.car; version=1')
      expect(entityResp.headers.get('content-disposition')).to.equal(`attachment; filename="${cid.toString()}_z.car"`)

      const entityBuf = new Uint8Array(await entityResp.arrayBuffer())
      const entityScopeReader = await CarReader.fromBytes(entityBuf)

      expect(await entityScopeReader.getRoots()).to.deep.equal([cid])
      expect(await itAll(entityScopeReader.cids())).to.deep.equal([cid])
    })
  })
})
