import { expect } from 'aegir/chai'
import { getContentRangeHeader } from '../../src/utils/response-headers.js'

describe('response-headers', () => {
  describe('getContentRangeHeader', () => {
    it('should return correct content range header when all options are set', () => {
      const start = 0
      const end = 500
      const total = 1000
      expect(getContentRangeHeader({ byteStart: start, byteEnd: end, contentSize: total })).to.equal(`bytes ${start}-${end}/${total}`)
    })

    it('should return correct content range header when only byteStart is provided', () => {
      expect(getContentRangeHeader({ byteStart: 500, byteEnd: undefined, contentSize: undefined })).to.equal('bytes 500-*/*')
    })

    it('should return correct content range header when only byteEnd is provided', () => {
      expect(getContentRangeHeader({ byteStart: undefined, byteEnd: 500, contentSize: undefined })).to.equal('bytes */*')
    })

    it('should return content range header with when only contentSize is provided', () => {
      expect(getContentRangeHeader({ byteStart: undefined, byteEnd: undefined, contentSize: 50 })).to.equal('bytes */50')
    })
  })
})
