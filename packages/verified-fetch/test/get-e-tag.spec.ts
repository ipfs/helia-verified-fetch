import { unixfs } from '@helia/unixfs'
import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import last from 'it-last'
import { CID } from 'multiformats/cid'
import { getETag } from '../src/utils/get-e-tag.js'
import { VerifiedFetch } from '../src/verified-fetch.js'
import { createHelia } from './fixtures/create-offline-helia.js'
import type { Helia } from 'helia'

const cidString = 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'
const testCID = CID.parse(cidString)

describe('getETag', () => {
  it('CID eTag', () => {
    expect(getETag({ cid: testCID, weak: true })).to.equal(`W/"${cidString}"`)
    expect(getETag({ cid: testCID, weak: false })).to.equal(`"${cidString}"`)
  })

  it('should return ETag with CID and format suffix', () => {
    expect(getETag({ cid: testCID, reqFormat: 'raw' })).to.equal(`"${cidString}.raw"`)
    expect(getETag({ cid: testCID, reqFormat: 'json' })).to.equal(`"${cidString}.json"`)
  })

  it('should return ETag with CID and range suffix', () => {
    expect(getETag({ cid: testCID, weak: true, reqFormat: 'car', rangeStart: 10, rangeEnd: 20 })).to.equal(`W/"${cidString}.car.10-20"`)
    // weak is false, but it's a car request, so weak is overridden.
    expect(getETag({ cid: testCID, weak: false, reqFormat: 'car', rangeStart: 10, rangeEnd: 20 })).to.equal(`W/"${cidString}.car.10-20"`)
  })

  it('should return ETag with CID, format and range suffix', () => {
    expect(getETag({ cid: testCID, reqFormat: 'raw', weak: false, rangeStart: 10, rangeEnd: 20 })).to.equal(`"${cidString}.raw.10-20"`)
  })

  it('should handle undefined rangeStart and rangeEnd', () => {
    expect(getETag({ cid: testCID, reqFormat: 'raw', weak: false, rangeStart: undefined, rangeEnd: undefined })).to.equal(`"${cidString}.raw"`)
    expect(getETag({ cid: testCID, reqFormat: 'raw', weak: false, rangeStart: 55, rangeEnd: undefined })).to.equal(`"${cidString}.raw.55-N"`)
    expect(getETag({ cid: testCID, reqFormat: 'raw', weak: false, rangeStart: undefined, rangeEnd: 77 })).to.equal(`"${cidString}.raw.0-77"`)
  })

  it('should handle tar appropriately', () => {
    expect(getETag({
      cid: CID.parse('bafkreialihlqnf5uwo4byh4n3cmwlntwqzxxs2fg5vanqdi3d7tb2l5xkm'),
      reqFormat: 'tar',
      weak: false,
      rangeStart: undefined,
      rangeEnd: undefined
    })).to.equal('W/"bafkreialihlqnf5uwo4byh4n3cmwlntwqzxxs2fg5vanqdi3d7tb2l5xkm.x-tar"')
  })
})

describe('getEtagRequest', () => {
  let helia: Helia
  let verifiedFetch: VerifiedFetch

  beforeEach(async () => {
    helia = await createHelia()
    verifiedFetch = new VerifiedFetch(helia)
  })

  afterEach(async () => {
    await stop(helia, verifiedFetch)
  })

  it('should return the proper etag for a verified fetch request', async () => {
    const finalRootFileContent = new Uint8Array([0x01, 0x02, 0x03])

    const fs = unixfs(helia)
    const res = await last(fs.addAll([{
      path: 'someFile.foo',
      content: finalRootFileContent
    }], {
      wrapWithDirectory: true
    }))

    if (res == null) {
      throw new Error('Import failed')
    }

    // get actual cid of the file from unixfs
    const terminus = await last(fs.ls(res.cid, { path: 'someFile.foo' }))
    if (terminus?.cid == null) {
      throw new Error('Terminus CID not found')
    }

    const response = await verifiedFetch.fetch(`ipfs://${res.cid}/someFile.foo`)
    expect(response.headers.get('etag')).to.equal(`"${terminus.cid.toString()}"`)
  })
})
