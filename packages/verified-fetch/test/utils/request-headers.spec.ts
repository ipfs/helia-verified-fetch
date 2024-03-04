import { expect } from 'aegir/chai'
import { getHeader, getRequestRange } from '../../src/utils/request-headers.js'

describe('request-headers', () => {
  describe('getHeader', () => {
    it('should return undefined when headers are undefined', () => {
      const result = getHeader(undefined, 'dummy')
      expect(result).to.be.undefined()
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

  describe('getRequestRange', () => {
    it('should return undefined when no Range header is provided', () => {
      const headers = new Headers()
      const result = getRequestRange(headers)
      expect(result).to.be.undefined()
    })

    it('should throw an error when an invalid Range header is provided', () => {
      expect(() => getRequestRange(new Headers({ Range: 'invalid' }))).to.throw('ERR_INVALID_RANGE_REQUEST')
      expect(() => getRequestRange(new Headers({ Range: 'bytes=foobar' }))).to.throw('ERR_INVALID_RANGE_REQUEST')
    })

    it('throws for multi-range requests', () => {
      expect(() => getRequestRange(new Headers({ Range: 'bytes=0-500, 600-1000' }))).to.throw('ERR_INVALID_RANGE_REQUEST')
    })

    it('should return correct range options when a valid Range header has start only', () => {
      const headers = new Headers({ Range: 'bytes=2-' })
      const result = getRequestRange(headers)
      expect(result).to.deep.equal({ offset: 2, length: undefined })
    })

    it('should return correct range options when a valid Range header has start and end', () => {
      const headers = new Headers({ Range: 'bytes=0-500' })
      const result = getRequestRange(headers)
      expect(result).to.deep.equal({ offset: 0, length: 501 })
    })

    it('should throw when Range header has end only and size is not passed', () => {
      expect(() => getRequestRange(new Headers({ Range: 'bytes=-20' }))).to.throw('ERR_HANDLING_RANGE_REQUEST')
    })

    it('should return correct range options when a valid Range header has end only', () => {
      const headers = new Headers({ Range: 'bytes=-25' })
      const result = getRequestRange(headers, 100n)
      expect(result).to.deep.equal({ offset: 75, length: 25 })
    })
  })
})
