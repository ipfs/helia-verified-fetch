import { expect } from 'aegir/chai'
import { getHeader } from '../../src/utils/request-headers.js'

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
})
