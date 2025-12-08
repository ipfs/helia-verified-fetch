import { expect } from 'aegir/chai'
import { getContentRangeHeader } from '../../src/utils/response-headers.js'

describe('response-headers', () => {
  describe('getContentRangeHeader', () => {
    it('should return correct content range header when all options are set', () => {
      const byteStart = 0
      const byteEnd = 500
      const byteSize = 1000
      expect(getContentRangeHeader(byteSize, byteStart, byteEnd)).to.equal(`bytes ${byteStart}-${byteEnd}/${byteSize}`)
    })

    it('should return correct content range header when only byteSize and byteEnd are provided', () => {
      expect(getContentRangeHeader(11, undefined, -9)).to.equal('bytes 2-10/11')
    })

    it('should return correct content range header when only byteSize and byteStart are provided', () => {
      expect(getContentRangeHeader(11, 5)).to.equal('bytes 5-10/11')
    })

    it('should return content range header with when only byteSize is provided', () => {
      expect(getContentRangeHeader(50)).to.equal('bytes */50')
    })

    it('should not allow range-end to equal or exceed the size of the file', () => {
      // byteEnd is equal to byteSize
      expect(() => getContentRangeHeader(0, 11, 11)).to.throw('Invalid range')

      // byteEnd is equal to byteSize
      expect(() => getContentRangeHeader(11, 11)).to.throw('Invalid range')

      // byteEnd is greater than byteSize
      expect(() => getContentRangeHeader(11, 12)).to.throw('Invalid range')

      // byteEnd is greater than byteSize
      expect(() => getContentRangeHeader(11, undefined, 11)).to.throw('Invalid range')
    })
  })
})
