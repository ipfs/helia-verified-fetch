import { car } from '@helia/car'
import { dagCbor } from '@helia/dag-cbor'
import { unixfs } from '@helia/unixfs'
import { CarReader } from '@ipld/car'
import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import itAll from 'it-all'
import { VerifiedFetch } from '../src/verified-fetch.js'
import { createHelia } from './fixtures/create-offline-helia.js'
import { createRandomDataChunks } from './fixtures/create-random-data-chunks.js'
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
    const reader = await CarReader.fromBytes(buf)
    expect(await reader.getRoots()).to.deep.equal([cid])
    expect(await itAll(reader.cids())).to.deep.equal([cid])
    expect(await itAll(reader.blocks())).to.have.lengthOf(1)
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
      const resp = await verifiedFetch.fetch(`ipfs://${cid}?format=car&dag-scope=all`)

      expect(resp.status).to.equal(200)
      expect(resp.headers.get('content-type')).to.equal('application/vnd.ipld.car; version=1')
      expect(resp.headers.get('content-disposition')).to.equal(`attachment; filename="${cid.toString()}.car"`)
      const buf = new Uint8Array(await resp.arrayBuffer())

      const reader = await CarReader.fromBytes(buf)

      expect(await reader.getRoots()).to.deep.equal([cid])
      expect(await itAll(reader.cids())).to.deep.equal([cid, nestedCid1, nestedCid2])
      expect(await itAll(reader.blocks())).to.have.lengthOf(3)

      expect(buf).to.equalBytes(await writer.bytes())
    })

    it('dag-scope=block returns only the nested block - plus verification/root block', async () => {
      const resp = await verifiedFetch.fetch(`ipfs://${cid}/z/a?format=car&dag-scope=block`)

      expect(resp.status).to.equal(200)
      expect(resp.headers.get('content-type')).to.equal('application/vnd.ipld.car; version=1')
      expect(resp.headers.get('content-disposition')).to.equal(`attachment; filename="${cid.toString()}_z_a.car"`)
      const buf = new Uint8Array(await resp.arrayBuffer())

      const reader = await CarReader.fromBytes(buf)

      expect(await reader.getRoots()).to.deep.equal([nestedCid2])
      // duplicates are not removed
      expect(await itAll(reader.cids())).to.deep.equal([cid, nestedCid2])
      expect(await itAll(reader.blocks())).to.have.lengthOf(2)
    })

    it('dag-scope=entity returns only the root block', async () => {
      const resp = await verifiedFetch.fetch(`ipfs://${cid}/z?format=car&dag-scope=entity`)

      expect(resp.status).to.equal(200)
      expect(resp.headers.get('content-type')).to.equal('application/vnd.ipld.car; version=1')
      expect(resp.headers.get('content-disposition')).to.equal(`attachment; filename="${cid.toString()}_z.car"`)

      const buf = new Uint8Array(await resp.arrayBuffer())
      const reader = await CarReader.fromBytes(buf)

      expect(await reader.getRoots()).to.deep.equal([cid])
      expect(await itAll(reader.cids())).to.deep.equal([cid])
    })
  })

  describe('dag-scope unixfs', () => {
    let helia: Helia
    let verifiedFetch: VerifiedFetch
    let rootCid: CID
    let fileCid: CID
    let fileChunkCids: CID[] = []
    let nestedFolderCid: CID
    let nestedFileCid: CID

    beforeEach(async () => {
      helia = await createHelia()
      verifiedFetch = new VerifiedFetch({
        helia
      })

      const fs = unixfs(helia)

      // Create a large file that will be split into multiple blocks
      const { chunks, combined: largeFileContent } = createRandomDataChunks(3, 1024 * 1024)

      for (const chunk of chunks) {
        fileChunkCids.push(await fs.addBytes(chunk))
      }

      // Create a directory with multiple files
      const files = [{
        path: 'large-file.txt',
        content: largeFileContent
      }, {
        path: 'nested/small-file.txt',
        content: new Uint8Array([1, 2, 3, 4, 5])
      }]

      const result = await itAll(fs.addAll(files, {
        wrapWithDirectory: true
      }))

      rootCid = result[result.length - 1].cid
      const fileStat = await fs.stat(rootCid, { path: 'large-file.txt', extended: true })

      const nestedFolderStat = await fs.stat(rootCid, { path: 'nested' })
      const nestedFileStat = await fs.stat(rootCid, { path: 'nested/small-file.txt' })
      fileCid = fileStat.cid
      nestedFolderCid = nestedFolderStat.cid
      nestedFileCid = nestedFileStat.cid
    })

    afterEach(async () => {
      // delete all fileChunkCids
      fileChunkCids = []
      await stop(helia, verifiedFetch)
    })

    it('dag-scope=all returns all blocks', async () => {
      const resp = await verifiedFetch.fetch(`ipfs://${rootCid}?format=car&dag-scope=all`)

      expect(resp.status).to.equal(200)
      expect(resp.headers.get('content-type')).to.equal('application/vnd.ipld.car; version=1')
      expect(resp.headers.get('content-disposition')).to.equal(`attachment; filename="${rootCid.toString()}.car"`)
      const buf = new Uint8Array(await resp.arrayBuffer())

      const reader = await CarReader.fromBytes(buf)

      expect(await reader.getRoots()).to.deep.equal([rootCid])
      expect(await itAll(reader.cids())).to.deep.equal([rootCid, fileCid, nestedFolderCid, ...fileChunkCids, nestedFileCid])
      expect(await itAll(reader.blocks())).to.have.lengthOf(4 + fileChunkCids.length)
    })

    it('dag-scope=block returns only the requested block', async () => {
      const resp = await verifiedFetch.fetch(`ipfs://${rootCid}/large-file.txt?format=car&dag-scope=block`)

      expect(resp.status).to.equal(200)
      expect(resp.headers.get('content-type')).to.equal('application/vnd.ipld.car; version=1')
      expect(resp.headers.get('content-disposition')).to.equal(`attachment; filename="${rootCid.toString()}_large-file.txt.car"`)
      const buf = new Uint8Array(await resp.arrayBuffer())

      const reader = await CarReader.fromBytes(buf)

      expect(await reader.getRoots()).to.deep.equal([fileCid])
      // contains root and file blocks
      expect(await itAll(reader.cids())).to.deep.equal([rootCid, fileCid])
    })

    it('dag-scope=entity for multi-block file returns all blocks for that entity', async () => {
      const resp = await verifiedFetch.fetch(`ipfs://${rootCid}/large-file.txt?format=car&dag-scope=entity`)

      expect(resp.status).to.equal(200)
      expect(resp.headers.get('content-type')).to.equal('application/vnd.ipld.car; version=1')
      expect(resp.headers.get('content-disposition')).to.equal(`attachment; filename="${rootCid.toString()}_large-file.txt.car"`)
      const buf = new Uint8Array(await resp.arrayBuffer())

      const reader = await CarReader.fromBytes(buf)

      expect(await reader.getRoots()).to.deep.equal([fileCid])
      // contains root and all large file blocks
      expect(await itAll(reader.cids())).to.deep.equal([rootCid, fileCid, ...fileChunkCids])
    })

    it('dag-scope=entity returns a directory and its content', async () => {
      const resp = await verifiedFetch.fetch(`ipfs://${rootCid}/nested?format=car&dag-scope=entity`)

      expect(resp.status).to.equal(200)
      expect(resp.headers.get('content-type')).to.equal('application/vnd.ipld.car; version=1')
      expect(resp.headers.get('content-disposition')).to.equal(`attachment; filename="${rootCid.toString()}_nested.car"`)

      const buf = new Uint8Array(await resp.arrayBuffer())
      const reader = await CarReader.fromBytes(buf)

      expect(await reader.getRoots()).to.deep.equal([nestedFolderCid])
      // contains verification blocks and full entity contents for the directory
      expect(await itAll(reader.cids())).to.deep.equal([rootCid, nestedFolderCid, nestedFileCid])
    })
  })
})
