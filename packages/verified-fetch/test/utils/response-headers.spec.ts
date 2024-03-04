import { expect } from 'aegir/chai'
import { getContentRangeHeader } from '../../src/utils/response-headers.js'

describe('response-headers', () => {
  describe('getContentRangeHeader', () => {
    it('should return correct content range header when total is provided', () => {
      const start = 0
      const end = 500
      const total = 1000
      const body = 'dummy body'
      const result = getContentRangeHeader(start, end, { total, body })
      expect(result).to.equal(`bytes ${start}-${end}/${total}`)
    })

    it('should return correct content range header when total is not provided', () => {
      const start = 0
      const end = 500
      const body = 'dummy body'
      const result = getContentRangeHeader(start, end, { body })
      expect(result).to.equal(`bytes ${start}-${end}/${body.length}`)
    })

    it('should return content range header with * when total and body size are not known', () => {
      const start = 0
      const end = 500
      const body = null
      const result = getContentRangeHeader(start, end, { body })
      expect(result).to.equal(`bytes ${start}-${end}/*`)
    })

    it('should return content range header with * body is a ReadableStream', () => {
      const start = 0
      const end = 500
      const body = new ReadableStream()
      const result = getContentRangeHeader(start, end, { body })
      expect(result).to.equal(`bytes ${start}-${end}/*`)
    })

    it('should return content range header with the correct arrayBuffer size', () => {
      const start = 0
      const end = 500
      const body = new ArrayBuffer(1000)
      const result = getContentRangeHeader(start, end, { body })
      expect(result).to.equal(`bytes ${start}-${end}/${body.byteLength}`)
    })

    it('should return content range header with the correct Blob size', () => {
      const start = 0
      const end = 500
      const body = new Blob(['dummy body'])
      const result = getContentRangeHeader(start, end, { body })
      expect(result).to.equal(`bytes ${start}-${end}/${body.size}`)
    })
  })
})
