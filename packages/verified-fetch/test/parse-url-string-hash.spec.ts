import { expect } from 'aegir/chai'
import { matchURLString } from '../src/utils/parse-url-string.js'

describe('URL parsing with hash fragments', () => {
  it('should strip hash fragment before parsing', () => {
    const url = 'ipfs://bafytest/path?filename=doc.pdf#section'
    const result = matchURLString(url)
    
    expect(result.query).to.equal('filename=doc.pdf')
    expect(result.query).to.not.include('#')
  })

  it('should handle URLs without hash', () => {
    const url = 'ipfs://bafytest/path?filename=doc.pdf'
    const result = matchURLString(url)
    
    expect(result.query).to.equal('filename=doc.pdf')
  })

  it('should handle hash with no query params', () => {
    const url = 'ipfs://bafytest/path#section'
    const result = matchURLString(url)
    
    expect(result.query).to.equal('')
  })

  it('should handle IPNS URLs with hash', () => {
    const url = 'ipns://example.com/path?query=1#anchor'
    const result = matchURLString(url)
    
    expect(result.protocol).to.equal('ipns')
    expect(result.cidOrPeerIdOrDnsLink).to.equal('example.com')
    expect(result.query).to.equal('query=1')
  })

  it('should handle subdomain gateway URLs with hash', () => {
    const url = 'https://bafytest.ipfs.example.com/path#section'
    const result = matchURLString(url)
    
    expect(result.protocol).to.equal('ipfs')
    expect(result.cidOrPeerIdOrDnsLink).to.equal('bafytest')
  })

  it('should handle path gateway URLs with hash', () => {
    const url = 'https://example.com/ipfs/bafytest/path#anchor'
    const result = matchURLString(url)
    
    expect(result.protocol).to.equal('ipfs')
    expect(result.cidOrPeerIdOrDnsLink).to.equal('bafytest')
  })
})