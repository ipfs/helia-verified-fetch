import { expect } from 'aegir/chai'
import { encodeDNSLinkLabel, decodeDNSLinkLabel } from '../../src/utils/dnslink-label.ts'

describe('dnslink-label', () => {
  it('should encode dnslink names', () => {
    expect(encodeDNSLinkLabel('en.wikipedia-on-ipfs.org')).to.equal('en-wikipedia--on--ipfs-org')
  })

  it('should decode dnslink names', () => {
    expect(decodeDNSLinkLabel('en-wikipedia--on--ipfs-org')).to.equal('en.wikipedia-on-ipfs.org')
  })
})
