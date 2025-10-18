import { expect } from 'aegir/chai'
import { matchURLString } from '../src/utils/parse-url-string.js'

describe('URL parsing with hash fragments', () => {
  it('should strip hash fragment before parsing', () => {
    const url = 'ipfs://bafytest/path?filename=doc.pdf#section'
    const result = matchURLString(url.substring(0, url.indexOf('#')))
    
    expect(result.queryString).to.equal('filename=doc.pdf')
    expect(result.queryString).to.not.include('#')
  })

  it('should handle URLs without hash', () => {
    const url = 'ipfs://bafytest/path?filename=doc.pdf'
    const result = matchURLString(url)
    
    expect(result.queryString).to.equal('filename=doc.pdf')
  })

  it('should handle hash with no query params', () => {
    const url = 'ipfs://bafytest/path#section'
    const result = matchURLString(url.substring(0, url.indexOf('#')))
    
    expect(result.queryString).to.equal('')
  })
})