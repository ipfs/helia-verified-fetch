import { expect } from 'aegir/chai'
import { CID } from 'multiformats/cid'
import { toCanonicalUri } from '../src/utils/canonical-uri.ts'

describe('to-canonical-uri', () => {
  describe('content path mirroring', () => {
    // raw (0x55) CIDv1 in base32
    const cid = 'bafkreidgvpkjawlxz6sffxzwgooowe5yt7i6wsyg236mfoks77nywkptdq'

    it('should omit the path when the pathname is empty', () => {
      expect(toCanonicalUri(new URL(`ipfs://${cid}`)).toString()).to.equal(`ipfs://${cid}`)
    })

    it('should map a bare "/" pathname to a "/" URI path', () => {
      expect(toCanonicalUri(new URL(`ipfs://${cid}/`)).toString()).to.equal(`ipfs://${cid}/`)
    })

    it('should keep a trailing slash after a directory path', () => {
      expect(toCanonicalUri(new URL(`ipfs://${cid}/dir/`)).toString()).to.equal(`ipfs://${cid}/dir/`)
    })

    it('should drop interior empty segments', () => {
      expect(toCanonicalUri(new URL(`ipfs://${cid}/a//b//`)).toString()).to.equal(`ipfs://${cid}/a/b/`)
    })

    it('should treat an encoded slash as a path separator', () => {
      expect(toCanonicalUri(new URL(`ipfs://${cid}/a%2Fb`)).toString()).to.equal(`ipfs://${cid}/a/b`)
    })

    it('should resolve dot segments revealed by decoding', () => {
      expect(toCanonicalUri(new URL(`ipfs://${cid}/a%2F..%2F.`)).toString()).to.equal(`ipfs://${cid}`)
    })
  })

  describe('authority normalization', () => {
    it('should omit the header when a CID IPNS root is not an IPNS name', () => {
      // raw (0x55) CIDv1: not libp2p-key, so it cannot name a public key
      const cid = CID.parse('bafkreidgvpkjawlxz6sffxzwgooowe5yt7i6wsyg236mfoks77nywkptdq')

      expect(() => toCanonicalUri(new URL(`ipns://${cid}`))).to.throw()
        .with.property('name', 'InvalidParametersError')
    })

    it('should strip a single trailing dot from a DNSLink name', () => {
      expect(toCanonicalUri(new URL('dnslink://dnslink.example.net./hello')).toString()).to.equal('dnslink://dnslink.example.net/hello')
    })

    it('should omit the header when a DNSLink name has no dot', () => {
      // a DNSLink name with no dot can point at different content on
      // each network, so it cannot be an ipns:// authority
      expect(() => toCanonicalUri(new URL('dnslink://examplemissingtld/hello'))).to.throw()
        .with.property('name', 'InvalidParametersError')
    })

    it('should keep a dotted DNSLink name from a private network', () => {
      expect(toCanonicalUri(new URL('dnslink://example.local/hello')).toString()).to.equal('dnslink://example.local/hello')
    })

    it('should omit the header when a DNSLink name keeps a trailing dot after stripping one', () => {
      expect(() => toCanonicalUri(new URL('dnslink://dnslink.example.net../hello'))).to.throw()
        .with.property('name', 'InvalidParametersError')
    })

    it('should convert an internationalized DNSLink name to A-labels', () => {
      // spell-checker: disable-next-line
      expect(toCanonicalUri(new URL('dnslink://dnslink.exämple.net/hello')).toString()).to.equal('dnslink://dnslink.xn--exmple-cua.net/hello')
    })

    it('should omit the header when a DNSLink name has an empty label', () => {
      expect(() => toCanonicalUri(new URL('dnslink://en..example.net/hello'))).to.throw()
        .with.property('name', 'InvalidParametersError')
    })

    it('should omit the header when a DNSLink label ends with a hyphen', () => {
      expect(() => toCanonicalUri(new URL('dnslink://a-.example.net/hello'))).to.throw()
        .with.property('name', 'InvalidParametersError')
    })
  })
})
