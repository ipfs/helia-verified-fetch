import { car } from '@helia/car'
import { dagCbor } from '@helia/dag-cbor'
import { unixfs } from '@helia/unixfs'
import { CarReader } from '@ipld/car'
import * as dagPb from '@ipld/dag-pb'
import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { importer } from 'ipfs-unixfs-importer'
import { fixedSize } from 'ipfs-unixfs-importer/chunker'
import all from 'it-all'
import toBuffer from 'it-to-buffer'
import { CID } from 'multiformats/cid'
import { VerifiedFetch } from '../src/verified-fetch.js'
import { createHelia } from './fixtures/create-offline-helia.js'
import { createRandomDataChunks } from './fixtures/create-random-data-chunks.js'
import type { Helia } from '@helia/interface'

describe('car files', () => {
  let helia: Helia
  let verifiedFetch: VerifiedFetch

  beforeEach(async () => {
    helia = await createHelia()
    verifiedFetch = new VerifiedFetch(helia)
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
    const carFile = await toBuffer(ca.export(cid))

    const resp = await verifiedFetch.fetch(cid, {
      headers: {
        accept: 'application/vnd.ipld.car'
      }
    })
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('content-type')).to.include('application/vnd.ipld.car; version=1')
    expect(resp.headers.get('content-disposition')).to.equal(`attachment; filename="${cid.toString()}.car"`)

    const buf = new Uint8Array(await resp.arrayBuffer())
    const reader = await CarReader.fromBytes(buf)
    expect(await reader.getRoots()).to.deep.equal([cid])
    expect(await all(reader.cids())).to.deep.equal([cid])
    expect(await all(reader.blocks())).to.have.lengthOf(1)
    expect(buf).to.equalBytes(carFile)
  })

  it('should return a 406 for a CARv2 file via the accept header', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const resp = await verifiedFetch.fetch(cid, {
      headers: {
        accept: 'application/vnd.ipld.car; version=2'
      }
    })
    expect(resp.status).to.equal(406)
  })

  it('should return a 406 for a CARv2 file via a query param', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const resp = await verifiedFetch.fetch(`ipfs://${cid}?format=car&car-version=2`)
    expect(resp.status).to.equal(406)
  })

  it('should support specifying a filename for a CAR file', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const resp = await verifiedFetch.fetch(`ipfs://${cid}?filename=foo.bar`, {
      headers: {
        accept: 'application/vnd.ipld.car'
      }
    })
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('content-type')).to.include('application/vnd.ipld.car; version=1')
    expect(resp.headers.get('content-disposition')).to.equal('attachment; filename="foo.bar"')
  })

  it('should default to duplicates for a CAR file', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const resp = await verifiedFetch.fetch(`ipfs://${cid}?filename=foo.bar`, {
      headers: {
        accept: 'application/vnd.ipld.car'
      }
    })
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('content-type')).to.include('dups=y')
  })

  it('should support specifying no duplicates for a CAR file', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const resp = await verifiedFetch.fetch(`ipfs://${cid}?filename=foo.bar`, {
      headers: {
        accept: 'application/vnd.ipld.car; dups=n'
      }
    })
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('content-type')).to.include('dups=n')
  })

  it('should default to unknown order for a CAR file', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const resp = await verifiedFetch.fetch(`ipfs://${cid}?filename=foo.bar`, {
      headers: {
        accept: 'application/vnd.ipld.car'
      }
    })
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('content-type')).to.include('order=unk')
  })

  it('should support specifying order for a CAR file', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const resp = await verifiedFetch.fetch(`ipfs://${cid}?filename=foo.bar`, {
      headers: {
        accept: 'application/vnd.ipld.car; order=dfs'
      }
    })
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('content-type')).to.include('order=dfs')
  })

  it('should skip identity CIDs in a CAR file', async () => {
    const cid = CID.parse('bafkqaf3imvwgy3zaneqgc3janfxgy2lomvscay3jmqfa')

    const resp = await verifiedFetch.fetch(`ipfs://${cid}`, {
      headers: {
        accept: 'application/vnd.ipld.car; dups=y'
      }
    })
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('content-type')).to.include('application/vnd.ipld.car')
  })

  it('should use options from accept header when format is also passed', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const resp = await verifiedFetch.fetch(`ipfs://${cid}?format=car`, {
      headers: {
        accept: 'application/vnd.ipld.car; order=dfs; dups=y'
      }
    })
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('content-type')).to.equal('application/vnd.ipld.car; version=1; order=dfs; dups=y')
  })

  describe('dag-scope cbor', () => {
    let cid: CID
    let nestedCid1: CID
    let nestedCid2: CID
    let carFile: Uint8Array
    let helia: Helia
    let verifiedFetch: VerifiedFetch

    after(async () => {
      await stop(helia, verifiedFetch)
    })
    before(async () => {
      helia = await createHelia()
      verifiedFetch = new VerifiedFetch(helia)

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
      carFile = await toBuffer(ca.export(cid))
    })

    it('dag-scope=all returns all blocks', async () => {
      const resp = await verifiedFetch.fetch(`ipfs://${cid}?format=car&dag-scope=all`)

      expect(resp.status).to.equal(200)
      expect(resp.headers.get('content-type')).to.include('application/vnd.ipld.car; version=1')
      expect(resp.headers.get('content-disposition')).to.equal(`attachment; filename="${cid.toString()}.car"`)
      const buf = new Uint8Array(await resp.arrayBuffer())

      const reader = await CarReader.fromBytes(buf)

      expect(await reader.getRoots()).to.deep.equal([cid])
      expect(await all(reader.cids())).to.deep.equal([cid, nestedCid1, nestedCid2])
      expect(await all(reader.blocks())).to.have.lengthOf(3)

      expect(buf).to.equalBytes(carFile)
    })

    it('dag-scope=block returns only the nested block - plus verification/root block', async () => {
      const resp = await verifiedFetch.fetch(`ipfs://${cid}/z/a?format=car&dag-scope=block`)

      expect(resp.status).to.equal(200)
      expect(resp.headers.get('content-type')).to.include('application/vnd.ipld.car; version=1')
      expect(resp.headers.get('content-disposition')).to.equal(`attachment; filename="${cid.toString()}_z_a.car"`)
      const buf = new Uint8Array(await resp.arrayBuffer())

      const reader = await CarReader.fromBytes(buf)

      expect(await reader.getRoots()).to.deep.equal([nestedCid2])
      expect(await all(reader.cids())).to.deep.equal([cid, nestedCid2])
      expect(await all(reader.blocks())).to.have.lengthOf(2)
    })

    it('dag-scope=entity returns only the root block', async () => {
      const resp = await verifiedFetch.fetch(`ipfs://${cid}/z?format=car&dag-scope=entity`)

      expect(resp.status).to.equal(200)
      expect(resp.headers.get('content-type')).to.include('application/vnd.ipld.car; version=1')
      expect(resp.headers.get('content-disposition')).to.equal(`attachment; filename="${cid.toString()}_z.car"`)

      const buf = new Uint8Array(await resp.arrayBuffer())
      const reader = await CarReader.fromBytes(buf)

      expect(await reader.getRoots()).to.deep.equal([cid])
      expect(await all(reader.cids())).to.deep.equal([cid])
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
      verifiedFetch = new VerifiedFetch(helia)

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

      const result = await all(fs.addAll(files, {
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
      expect(resp.headers.get('content-type')).to.include('application/vnd.ipld.car; version=1')
      expect(resp.headers.get('content-disposition')).to.equal(`attachment; filename="${rootCid.toString()}.car"`)

      const buf = new Uint8Array(await resp.arrayBuffer())
      const reader = await CarReader.fromBytes(buf)
      expect(await reader.getRoots()).to.deep.equal([rootCid])
      expect(await all(reader.cids())).to.deep.equal([rootCid, fileCid, nestedFolderCid, ...fileChunkCids, nestedFileCid])
      expect(await all(reader.blocks())).to.have.lengthOf(4 + fileChunkCids.length)
    })

    it('dag-scope=block returns only the requested block', async () => {
      const resp = await verifiedFetch.fetch(`ipfs://${rootCid}/large-file.txt?format=car&dag-scope=block`)
      expect(resp.status).to.equal(200)
      expect(resp.headers.get('content-type')).to.include('application/vnd.ipld.car; version=1')
      expect(resp.headers.get('content-disposition')).to.equal(`attachment; filename="${rootCid.toString()}_large-file.txt.car"`)

      const buf = new Uint8Array(await resp.arrayBuffer())
      const reader = await CarReader.fromBytes(buf)
      expect(await reader.getRoots()).to.deep.equal([fileCid])
      expect(await all(reader.cids())).to.deep.equal([rootCid, fileCid], 'did not contain root and file blocks')
    })

    it('dag-scope=entity for multi-block file returns all blocks for that entity', async () => {
      const resp = await verifiedFetch.fetch(`ipfs://${rootCid}/large-file.txt?format=car&dag-scope=entity`)
      expect(resp.status).to.equal(200)
      expect(resp.headers.get('content-type')).to.include('application/vnd.ipld.car; version=1')
      expect(resp.headers.get('content-disposition')).to.equal(`attachment; filename="${rootCid.toString()}_large-file.txt.car"`)

      const buf = new Uint8Array(await resp.arrayBuffer())
      const reader = await CarReader.fromBytes(buf)
      expect(await reader.getRoots()).to.deep.equal([fileCid])
      expect(await all(reader.cids())).to.deep.equal([rootCid, fileCid, ...fileChunkCids], 'did not contain root and all large file blocks')
    })

    it('dag-scope=entity returns a directory and its content', async () => {
      const resp = await verifiedFetch.fetch(`ipfs://${rootCid}/nested?format=car&dag-scope=entity`)
      expect(resp.status).to.equal(200)
      expect(resp.headers.get('content-type')).to.include('application/vnd.ipld.car; version=1')
      expect(resp.headers.get('content-disposition')).to.equal(`attachment; filename="${rootCid.toString()}_nested.car"`)

      const buf = new Uint8Array(await resp.arrayBuffer())
      const reader = await CarReader.fromBytes(buf)
      expect(await reader.getRoots()).to.deep.equal([nestedFolderCid])
      expect(await all(reader.cids())).to.deep.equal([rootCid, nestedFolderCid], 'did not contain verification blocks and listing for the directory')
    })

    it('dag-scope=entity with entity-bytes returns slice of content', async () => {
      const data = crypto.getRandomValues(new Uint8Array(1024))
      const importResults = await all(importer([{
        content: data
      }], helia.blockstore, {
        chunker: fixedSize({
          chunkSize: 256
        })
      }))

      const rootCid = importResults[0].cid
      const block = await toBuffer(helia.blockstore.get(rootCid))
      const rootNode = dagPb.decode(block)

      expect(rootNode.Links).to.have.lengthOf(4)

      await expect(helia.blockstore.has(rootNode.Links[1].Hash)).to.eventually.be.true()
      await expect(helia.blockstore.has(rootNode.Links[2].Hash)).to.eventually.be.true()
      await expect(helia.blockstore.has(rootNode.Links[3].Hash)).to.eventually.be.true()

      // should have 4x links, delete the blocks for the last three
      for (const link of rootNode.Links.slice(1)) {
        await helia.blockstore.delete(link.Hash)
      }

      await expect(helia.blockstore.has(rootNode.Links[1].Hash)).to.eventually.be.false()
      await expect(helia.blockstore.has(rootNode.Links[2].Hash)).to.eventually.be.false()
      await expect(helia.blockstore.has(rootNode.Links[3].Hash)).to.eventually.be.false()

      // request only the first 10 bytes, should not attempt to access
      // subsequent blocks that we don't have
      const resp = await verifiedFetch.fetch(`ipfs://${rootCid}?format=car&dag-scope=entity&entity-bytes=0:10`)

      expect(resp.status).to.equal(200)
      expect(resp.headers.get('content-type')).to.include('application/vnd.ipld.car; version=1')
      expect(resp.headers.get('content-disposition')).to.equal(`attachment; filename="${rootCid.toString()}.car"`)

      const buf = new Uint8Array(await resp.arrayBuffer())
      const reader = await CarReader.fromBytes(buf)

      expect(await reader.getRoots()).to.deep.equal([rootCid])
      // contains only the blocks with the requested bytes
      expect(await all(reader.cids())).to.deep.equal([rootCid, rootNode.Links[0].Hash])
    })

    it('entity-bytes implies dag-scope=entity', async () => {
      const resp = await verifiedFetch.fetch(`ipfs://${rootCid}/large-file.txt?format=car&entity-bytes=0:*`)
      expect(resp.status).to.equal(200)
      expect(resp.headers.get('content-type')).to.include('application/vnd.ipld.car; version=1')
      expect(resp.headers.get('content-disposition')).to.equal(`attachment; filename="${rootCid.toString()}_large-file.txt.car"`)

      const buf = new Uint8Array(await resp.arrayBuffer())
      const reader = await CarReader.fromBytes(buf)
      expect(await reader.getRoots()).to.deep.equal([fileCid])
      expect(await all(reader.cids())).to.deep.equal([rootCid, fileCid, ...fileChunkCids], 'did not contain root and all large file blocks')
    })
  })
})
