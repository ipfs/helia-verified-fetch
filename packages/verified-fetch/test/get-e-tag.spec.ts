import { expect } from 'aegir/chai'
import { CID } from 'multiformats/cid'
import { getETag } from '../src/utils/get-e-tag.js'

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
