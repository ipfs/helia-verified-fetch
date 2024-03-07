import { expect } from 'aegir/chai'
import { getContentRangeHeader } from '../../src/utils/response-headers.js'

describe('response-headers', () => {
  describe('getContentRangeHeader', () => {
    it('should return correct content range header when all options are set', () => {
      const byteStart = 0
      const byteEnd = 500
      const byteSize = 1000
      expect(getContentRangeHeader({ byteStart, byteEnd, byteSize })).to.equal(`bytes ${byteStart}-${byteEnd}/${byteSize}`)
    })

    it('should return correct content range header when only byteEnd and byteSize are provided', () => {
      expect(getContentRangeHeader({ byteStart: undefined, byteEnd: 9, byteSize: 11 })).to.equal('bytes 3-11/11')
    })

    it('should return correct content range header when only byteStart is provided', () => {
      expect(getContentRangeHeader({ byteStart: 500, byteEnd: undefined, byteSize: undefined })).to.equal('bytes 500-*/*')
    })

    it('should return correct content range header when only byteEnd is provided', () => {
      expect(getContentRangeHeader({ byteStart: undefined, byteEnd: 500, byteSize: undefined })).to.equal('bytes */*')
    })

    it('should return content range header with when only byteSize is provided', () => {
      expect(getContentRangeHeader({ byteStart: undefined, byteEnd: undefined, byteSize: 50 })).to.equal('bytes */50')
    })
  })
})
