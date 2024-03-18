import { expect } from 'aegir/chai'
import { getHeader, calculateByteRangeIndexes } from '../../src/utils/request-headers.js'

describe('request-headers', () => {
  describe('getHeader', () => {
    it('should return undefined when headers are undefined', () => {
      expect(getHeader(undefined, 'dummy')).to.be.undefined()
      expect(getHeader(new Headers(), 'dummy')).to.be.undefined()
      expect(getHeader({}, 'dummy')).to.be.undefined()
      expect(getHeader([], 'dummy')).to.be.undefined()
    })

    it('should return correct header value for Headers instance', () => {
      const headers = new Headers({ Dummy: 'value' })
      expect(getHeader(headers, 'Dummy')).to.equal('value')
      expect(getHeader(headers, 'dummy')).to.equal('value')
    })

    it('should return correct header value for array of tuples', () => {
      const headers: Array<[string, string]> = [['Dummy', 'value']]
      expect(getHeader(headers, 'Dummy')).to.equal('value')
      expect(getHeader(headers, 'dummy')).to.equal('value')
    })

    it('should return correct header value for record', () => {
      const headers: Record<string, string> = { Dummy: 'value' }
      expect(getHeader(headers, 'Dummy')).to.equal('value')
      expect(getHeader(headers, 'dummy')).to.equal('value')
    })
  })

  describe('calculateByteRangeIndexes', () => {
    const testCases = [
      // Range: bytes=5-
      { start: 5, end: undefined, fileSize: 10, expected: { byteSize: 5, start: 5, end: 9 } },
      // Range: bytes=-5
      { start: undefined, end: 5, fileSize: 10, expected: { byteSize: 5, start: 5, end: 9 } },
      // Range: bytes=0-0
      { start: 0, end: 0, fileSize: 10, expected: { byteSize: 1, start: 0, end: 0 } },
      // Range: bytes=5- with unknown filesize
      { start: 5, end: undefined, fileSize: undefined, expected: { start: 5 } },
      // Range: bytes=-5 with unknown filesize
      { start: undefined, end: 5, fileSize: undefined, expected: { end: 5 } },
      // Range: bytes=0-0 with unknown filesize
      { start: 0, end: 0, fileSize: undefined, expected: { byteSize: 1, start: 0, end: 0 } },
      // Range: bytes=-9 & fileSize=11
      { start: undefined, end: 9, fileSize: 11, expected: { byteSize: 9, start: 2, end: 10 } },
      // Range: bytes=-11 & fileSize=11
      { start: undefined, end: 11, fileSize: 11, expected: { byteSize: 11, start: 0, end: 10 } },
      // Range: bytes=-2 & fileSize=11
      { start: undefined, end: 2, fileSize: 11, expected: { byteSize: 2, start: 9, end: 10 } },
      // Range request with no range (added for coverage)
      { start: undefined, end: undefined, fileSize: 10, expected: { byteSize: 10, start: 0, end: 9 } }

    ]
    testCases.forEach(({ start, end, fileSize, expected }) => {
      it(`should return expected result for bytes=${start ?? ''}-${end ?? ''} and fileSize=${fileSize}`, () => {
        expect(calculateByteRangeIndexes(start, end, fileSize)).to.deep.equal(expected)
      })
    })
    it('throws error for invalid range', () => {
      expect(() => calculateByteRangeIndexes(5, 4, 10)).to.throw('Invalid range: Range-start index is greater than range-end index.')
      expect(() => calculateByteRangeIndexes(5, 11, 11)).to.throw('Invalid range: Range-end index is greater than or equal to the size of the file.')
      expect(() => calculateByteRangeIndexes(undefined, 12, 11)).to.throw('Invalid range: Range-end index is greater than the size of the file.')
      expect(() => calculateByteRangeIndexes(-1, 5, 10)).to.throw('Invalid range: Range-start index cannot be negative.')
    })
  })
})
