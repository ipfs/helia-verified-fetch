import { expect } from 'aegir/chai'
import { getContentRangeHeader } from '../../src/utils/response-headers.js'

describe('response-headers', () => {
  describe('getContentRangeHeader', () => {
    const body = 'dummy body'
    const bodySize = body.length
    it('should return correct content range header when only given offset', () => {
      const offset = 2
      const result = getContentRangeHeader({ body, offset })
      expect(result).to.equal(`bytes 2-${bodySize}/${bodySize}`)
    })

    it('should return correct content range header when only given length', () => {
      const length = 2
      const result = getContentRangeHeader({ body, length })
      expect(result).to.equal(`bytes 0-1/${bodySize}`)
    })

    it('should override byte-size when total is provided', () => {
      const offset = 1
      const length = 2
      const total = 4
      const result = getContentRangeHeader({ total, body, offset, length })
      expect(result).to.equal('bytes 1-2/4')
    })

    it('should return correct content range header when total is not provided', () => {
      const offset = 0
      const length = 3
      const result = getContentRangeHeader({ body, offset, length })
      expect(result).to.equal(`bytes 0-2/${body.length}`)
    })

    it('should return content range header with * when total and body size are not known', () => {
      const offset = 1
      const length = 4
      const body = null
      const result = getContentRangeHeader({ body, offset, length })
      expect(result).to.equal('bytes 1-4/*')
    })

    it('should return content range header with * body is a ReadableStream', () => {
      const offset = 5
      const length = 500
      const body = new ReadableStream()
      const result = getContentRangeHeader({ body, offset, length })
      expect(result).to.equal('bytes 5-504/*')
    })

    it('should return content range header with the correct arrayBuffer size', () => {
      const offset = 6
      const length = 40
      const body = new ArrayBuffer(1000)
      const result = getContentRangeHeader({ body, offset, length })
      expect(result).to.equal(`bytes 6-45/${body.byteLength}`)
    })

    it('should return content range header with the correct Blob size', () => {
      const offset = 7
      const length = 2
      const body = new Blob(['dummy body'])
      const result = getContentRangeHeader({ body, offset, length })
      expect(result).to.equal(`bytes 7-8/${body.size}`)
    })

    it('should return content range header with the correct Uint8Array size', () => {
      const offset = 2
      const length = 9
      const body = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      const result = getContentRangeHeader({ body, offset, length })
      expect(result).to.equal('bytes 2-10/11')
    })

    it('should return content range header with the correct Uint8Array size & explicit total', () => {
      const offset = 4
      const body = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      const result = getContentRangeHeader({ body, offset, total: 11 })
      expect(result).to.equal('bytes 4-11/11')
    })

    it('should return content range header with offset, length, & total', () => {
      const result = getContentRangeHeader({ body: null, offset: 2, length: 9, total: 11 })
      expect(result).to.equal('bytes 2-10/11')
    })
  })
})
