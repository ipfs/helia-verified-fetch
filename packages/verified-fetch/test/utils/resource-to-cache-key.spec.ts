import { expect } from 'aegir/chai'
import { CID } from 'multiformats/cid'
import { resourceToSessionCacheKey } from '../../src/utils/resource-to-cache-key.js'

describe('resource-to-cache-key', () => {
  it('converts url with IPFS path', () => {
    expect(resourceToSessionCacheKey('https://localhost:8080/ipfs/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJA'))
      .to.equal('ipfs://QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJA')
  })

  it('converts url with IPFS path and resource path', () => {
    expect(resourceToSessionCacheKey('https://localhost:8080/ipfs/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJA/foo/bar/baz.txt'))
      .to.equal('ipfs://QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJA')
  })

  it('converts url with IPNS path', () => {
    expect(resourceToSessionCacheKey('https://localhost:8080/ipns/ipfs.io'))
      .to.equal('dnslink://ipfs.io')
  })

  it('converts url with IPNS path and resource path', () => {
    expect(resourceToSessionCacheKey('https://localhost:8080/ipns/ipfs.io/foo/bar/baz.txt'))
      .to.equal('dnslink://ipfs.io')
  })

  it('converts IPFS subdomain', () => {
    expect(resourceToSessionCacheKey('https://QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJA.ipfs.localhost:8080'))
      .to.equal('ipfs://QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJA')
  })

  it('converts IPFS subdomain with path', () => {
    expect(resourceToSessionCacheKey('https://QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJA.ipfs.localhost:8080/foo/bar/baz.txt'))
      .to.equal('ipfs://QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJA')
  })

  it('converts IPNS subdomain', () => {
    expect(resourceToSessionCacheKey('https://ipfs.io.ipns.localhost:8080'))
      .to.equal('dnslink://ipfs.io')
  })

  it('converts IPNS subdomain with resource path', () => {
    expect(resourceToSessionCacheKey('https://ipfs.io.ipns.localhost:8080/foo/bar/baz.txt'))
      .to.equal('dnslink://ipfs.io')
  })

  it('converts CID', () => {
    expect(resourceToSessionCacheKey(CID.parse('QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJA')))
      .to.equal('ipfs://QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJA')
  })

  it('converts CID string', () => {
    expect(resourceToSessionCacheKey('QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJA'))
      .to.equal('ipfs://QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJA')
  })
})
