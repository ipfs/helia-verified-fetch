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
      expect(getContentRangeHeader({ byteStart: undefined, byteEnd: 9, byteSize: 11 })).to.equal('bytes 2-10/11')
    })

    it('should return correct content range header when only byteStart and byteSize are provided', () => {
      expect(getContentRangeHeader({ byteStart: 5, byteEnd: undefined, byteSize: 11 })).to.equal('bytes 5-10/11')
    })

    it('should return correct content range header when only byteStart is provided', () => {
      expect(getContentRangeHeader({ byteStart: 500, byteEnd: undefined, byteSize: undefined })).to.equal('bytes */*')
    })

    it('should return correct content range header when only byteEnd is provided', () => {
      expect(getContentRangeHeader({ byteStart: undefined, byteEnd: 500, byteSize: undefined })).to.equal('bytes */*')
    })

    it('should return content range header with when only byteSize is provided', () => {
      expect(getContentRangeHeader({ byteStart: undefined, byteEnd: undefined, byteSize: 50 })).to.equal('bytes */50')
    })

    it('should not allow range-end to equal or exceed the size of the file', () => {
      expect(() => getContentRangeHeader({ byteStart: 0, byteEnd: 11, byteSize: 11 })).to.throw('Invalid range') // byteEnd is equal to byteSize
      expect(() => getContentRangeHeader({ byteStart: undefined, byteEnd: 11, byteSize: 11 })).to.throw('Invalid range') // byteEnd is equal to byteSize
      expect(() => getContentRangeHeader({ byteStart: undefined, byteEnd: 12, byteSize: 11 })).to.throw('Invalid range') // byteEnd is greater than byteSize
      expect(() => getContentRangeHeader({ byteStart: 11, byteEnd: undefined, byteSize: 11 })).to.throw('Invalid range') // byteEnd is greater than byteSize
    })
  })
})
