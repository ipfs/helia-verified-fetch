import { dagCbor } from '@helia/dag-cbor'
import { createIPNSRecord } from '@helia/ipns'
import { unixfs } from '@helia/unixfs'
import { ed25519Crypto } from '@ipshipyard/crypto'
import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import all from 'it-all'
import { base36 } from 'multiformats/bases/base36'
import { base58btc } from 'multiformats/bases/base58'
import { CID } from 'multiformats/cid'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { createVerifiedFetch } from '../src/index.ts'
import { toIpfsUri } from '../src/utils/ipfs-uri.ts'
import { createHelia } from './fixtures/create-offline-helia.ts'
import type { VerifiedFetch } from '../src/index.ts'
import type { DNSLink } from '@helia/dnslink'
import type { Helia } from '@helia/interface'
import type { IPNSResolver } from '@helia/ipns'
import type { StubbedInstance } from 'sinon-ts'

/**
 * Shared IPIP-0548 test vectors: UnixFS file names inside a directory and the
 * URI path segment the ipfs-uri header must contain for them. Every byte
 * outside the RFC 3986 unreserved set is percent-encoded over UTF-8 with
 * uppercase hex.
 */
const SEGMENT_VECTORS: Array<{ name: string, segment: string }> = [
  { name: 'plain.txt', segment: 'plain.txt' },
  { name: 'with space.txt', segment: 'with%20space.txt' },
  { name: '100% sure.txt', segment: '100%25%20sure.txt' },
  { name: 'a#b?c.txt', segment: 'a%23b%3Fc.txt' },
  // spell-checker: disable-next-line
  { name: 'łódź.txt', segment: '%C5%82%C3%B3d%C5%BA.txt' },
  { name: 'emoji\u{1F680}.txt', segment: 'emoji%F0%9F%9A%80.txt' }
]

describe('ipfs-uri header', () => {
  let helia: Helia
  let fetch: VerifiedFetch
  let dnsLink: StubbedInstance<DNSLink>
  let ipnsResolver: StubbedInstance<IPNSResolver>

  beforeEach(async () => {
    helia = await createHelia()
    dnsLink = stubInterface()
    ipnsResolver = stubInterface()
    fetch = await createVerifiedFetch(helia, {
      dnsLink,
      ipnsResolver
    })
  })

  afterEach(async () => {
    await stop(helia)
  })

  describe('path segment encoding', () => {
    SEGMENT_VECTORS.forEach(({ name, segment }) => {
      it(`should encode a UnixFS file name as "${segment}"`, async () => {
        const fs = unixfs(helia)
        const [, directory] = await all(fs.addAll([{
          path: `/${name}`,
          content: uint8ArrayFromString('hello world\n')
        }], {
          wrapWithDirectory: true
        }))

        expect(directory.cid.version).to.equal(1)

        const resp = await fetch(`ipfs://${directory.cid}/${encodeURIComponent(name)}`)
        expect(resp.status).to.equal(200)
        expect(resp.headers.get('ipfs-uri')).to.equal(`ipfs://${directory.cid}/${segment}`)
      })
    })
  })

  describe('content path mirroring', () => {
    // raw (0x55) CIDv1 in base32
    const cid = 'bafkreidgvpkjawlxz6sffxzwgooowe5yt7i6wsyg236mfoks77nywkptdq'

    it('should omit the path when the pathname is empty', () => {
      expect(toIpfsUri(new URL(`ipfs://${cid}`))).to.equal(`ipfs://${cid}`)
    })

    it('should map a bare "/" pathname to a "/" URI path', () => {
      expect(toIpfsUri(new URL(`ipfs://${cid}/`))).to.equal(`ipfs://${cid}/`)
    })

    it('should keep a trailing slash after a directory path', () => {
      expect(toIpfsUri(new URL(`ipfs://${cid}/dir/`))).to.equal(`ipfs://${cid}/dir/`)
    })

    it('should drop interior empty segments', () => {
      expect(toIpfsUri(new URL(`ipfs://${cid}/a//b//`))).to.equal(`ipfs://${cid}/a/b/`)
    })

    it('should treat an encoded slash as a path separator', () => {
      expect(toIpfsUri(new URL(`ipfs://${cid}/a%2Fb`))).to.equal(`ipfs://${cid}/a/b`)
    })

    it('should resolve dot segments revealed by decoding', () => {
      expect(toIpfsUri(new URL(`ipfs://${cid}/a%2F..%2F.`))).to.equal(`ipfs://${cid}`)
    })
  })

  describe('authority normalization', () => {
    it('should normalize a CIDv0 root to a base32 CIDv1 authority', async () => {
      const fs = unixfs(helia)
      const cid = await fs.addBytes(uint8ArrayFromString('hello world\n'), {
        cidVersion: 0,
        rawLeaves: false
      })

      expect(cid.version).to.equal(0)
      expect(cid.toString()).to.match(/^Qm/)

      const resp = await fetch(`ipfs://${cid}`)
      expect(resp.status).to.equal(200)
      expect(resp.headers.get('ipfs-uri')).to.equal(`ipfs://${cid.toV1()}`)
    })

    it('should normalize a base58 IPNS name to a base36 CIDv1 authority', async () => {
      const fs = unixfs(helia)
      const cid = await fs.addBytes(uint8ArrayFromString('hello world\n'))
      const privateKey = await ed25519Crypto().generatePrivateKey()
      const value = `/ipfs/${cid}`
      const record = await createIPNSRecord(privateKey, value, 1, 10_000)
      const name = base58btc.baseEncode(privateKey.publicKey.toMultihash().bytes)

      ipnsResolver.resolve.withArgs(privateKey.publicKey.toMultihash()).returns((async function * () {
        yield {
          value,
          record
        }
      })())

      const resp = await fetch(`ipns://${name}`)
      expect(resp.status).to.equal(200)

      const expected = privateKey.publicKey.toCID().toString(base36)
      expect(expected).to.match(/^k/)
      expect(resp.headers.get('ipfs-uri')).to.equal(`ipns://${expected}`)
    })

    it('should use the dotted lowercase DNS name for a DNSLink authority', async () => {
      const obj = {
        hello: 'world'
      }
      const c = dagCbor(helia)
      const cid = await c.add(obj)
      const domain = 'dnslink.example.net'

      dnsLink.resolve.withArgs(domain).resolves([{
        namespace: 'ipfs',
        cid,
        path: '',
        answer: stubInterface()
      }])

      const resp = await fetch(`ipns://${domain}/hello`)
      expect(resp.status).to.equal(200)
      expect(resp.headers.get('ipfs-uri')).to.equal(`ipns://${domain}/hello`)
    })

    it('should lowercase a mixed-case DNSLink authority', async () => {
      const obj = {
        hello: 'world'
      }
      const c = dagCbor(helia)
      const cid = await c.add(obj)

      // WHATWG URLs keep the case of ipns:// hostnames so the resolver sees
      // the mixed-case domain while the header value must be lowercase
      dnsLink.resolve.withArgs('DNSLink.Example.NET').resolves([{
        namespace: 'ipfs',
        cid,
        path: '',
        answer: stubInterface()
      }])

      const resp = await fetch('ipns://DNSLink.Example.NET/hello')
      expect(resp.status).to.equal(200)
      expect(resp.headers.get('ipfs-uri')).to.equal('ipns://dnslink.example.net/hello')
    })

    it('should omit the header when a CID IPNS root is not an IPNS name', () => {
      // raw (0x55) CIDv1: not libp2p-key, so it cannot name a public key
      const cid = CID.parse('bafkreidgvpkjawlxz6sffxzwgooowe5yt7i6wsyg236mfoks77nywkptdq')

      expect(toIpfsUri(new URL(`ipns://${cid}`))).to.equal(undefined)
    })

    it('should strip a single trailing dot from a DNSLink name', () => {
      expect(toIpfsUri(new URL('dnslink://dnslink.example.net./hello'))).to.equal('ipns://dnslink.example.net/hello')
    })

    it('should omit the header when a DNSLink name has no dot', () => {
      expect(toIpfsUri(new URL('dnslink://localhost/hello'))).to.equal(undefined)
    })

    it('should omit the header when a DNSLink name keeps a trailing dot after stripping one', () => {
      expect(toIpfsUri(new URL('dnslink://dnslink.example.net../hello'))).to.equal(undefined)
    })

    it('should convert an internationalized DNSLink name to A-labels', () => {
      // spell-checker: disable-next-line
      expect(toIpfsUri(new URL('dnslink://dnslink.exämple.net/hello'))).to.equal('ipns://dnslink.xn--exmple-cua.net/hello')
    })

    it('should omit the header when a DNSLink name has an empty label', () => {
      expect(toIpfsUri(new URL('dnslink://en..example.net/hello'))).to.equal(undefined)
    })

    it('should omit the header when a DNSLink label ends with a hyphen', () => {
      expect(toIpfsUri(new URL('dnslink://a-.example.net/hello'))).to.equal(undefined)
    })
  })

  describe('query and fragment', () => {
    it('should not include the request query string', async () => {
      const fs = unixfs(helia)
      const [, directory] = await all(fs.addAll([{
        path: '/plain.txt',
        content: uint8ArrayFromString('hello world\n')
      }], {
        wrapWithDirectory: true
      }))

      const resp = await fetch(`ipfs://${directory.cid}/plain.txt?download=true&filename=other.txt`)
      expect(resp.status).to.equal(200)
      expect(resp.headers.get('ipfs-uri')).to.equal(`ipfs://${directory.cid}/plain.txt`)
    })
  })

  describe('length limit', () => {
    it('should send a value of exactly 8192 bytes and omit a longer one', async () => {
      const fs = unixfs(helia)
      // 'ipfs://' + 59-char base32 CIDv1 root + '/'
      const prefixLength = 67
      const exact = 'a'.repeat(8192 - prefixLength)
      const over = 'b'.repeat(8192 - prefixLength + 1)
      const entries = await all(fs.addAll([{
        path: `/${exact}`,
        content: uint8ArrayFromString('hello world\n')
      }, {
        path: `/${over}`,
        content: uint8ArrayFromString('hello world\n')
      }], {
        wrapWithDirectory: true
      }))
      const directory = entries[entries.length - 1]

      expect(`ipfs://${directory.cid}/`).to.have.lengthOf(prefixLength)

      const exactResp = await fetch(`ipfs://${directory.cid}/${exact}`)
      expect(exactResp.status).to.equal(200)
      const uri = exactResp.headers.get('ipfs-uri')
      expect(uri).to.equal(`ipfs://${directory.cid}/${exact}`)
      expect(uri).to.have.lengthOf(8192)

      const overResp = await fetch(`ipfs://${directory.cid}/${over}`)
      expect(overResp.status).to.equal(200)
      expect(overResp.headers.get('ipfs-uri')).to.be.null()
    })
  })

  describe('cors', () => {
    it('should expose ipfs-uri to cross-origin clients', async () => {
      const fs = unixfs(helia)
      const cid = await fs.addBytes(uint8ArrayFromString('hello world\n'))

      const resp = await fetch(`ipfs://${cid}`)
      expect(resp.status).to.equal(200)
      expect(resp.headers.get('access-control-expose-headers')).to.include('Ipfs-Uri')
    })
  })
})
