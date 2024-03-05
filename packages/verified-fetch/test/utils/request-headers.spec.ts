import { expect } from 'aegir/chai'
import { getHeader, getRequestRange } from '../../src/utils/request-headers.js'

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
      const result = getRequestRange(new Headers({ Range: 'bytes=2-' }))
      expect(result).to.deep.equal({ offset: 2, length: undefined, suffixLength: undefined })
    })

    it('should return correct range options when a valid Range header has start and end', () => {
      const result = getRequestRange(new Headers({ Range: 'bytes=0-500' }))
      expect(result).to.deep.equal({ offset: 0, length: 501, suffixLength: undefined })
    })

    it('should return only suffixLength when not passed range-start nor size', () => {
      const result = getRequestRange(new Headers({ Range: 'bytes=-20' }))
      expect(result).to.deep.equal({ offset: undefined, length: undefined, suffixLength: 20 })
    })

    it('should return correct range options when a valid Range header has end only', () => {
      const headers = new Headers({ Range: 'bytes=-25' })
      const result = getRequestRange(headers, 100n)
      expect(result).to.deep.equal({ offset: 75, length: 25, suffixLength: undefined })
    })
  })
})
