import { unixfs } from '@helia/unixfs'
import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { MemoryBlockstore } from 'blockstore-core'
import { base36 } from 'multiformats/bases/base36'
import { CID } from 'multiformats/cid'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { URLResolver } from '../src/url-resolver.js'
import { ServerTiming } from '../src/utils/server-timing.ts'
import { ipnsRecordStub } from './fixtures/ipns-stubs.js'
import type { DNSLink } from '@helia/dnslink'
import type { IPNSResolver } from '@helia/ipns'
import type { PeerId } from '@libp2p/interface'
import type { Answer } from '@multiformats/dns'
import type { Helia } from 'helia'
import type { Blockstore } from 'interface-blockstore'
import type { StubbedInstance } from 'sinon-ts'

describe('url-resolver', () => {
  let ipnsResolver: StubbedInstance<IPNSResolver>
  let dnsLink: StubbedInstance<DNSLink>
  let helia: StubbedInstance<Helia>
  let resolver: URLResolver
  let blockstore: Blockstore

  let txtFileCID: CID
  let nestedDirectoryCID: CID
  let directoryCID: CID

  /**
   * Assert that the passed url is matched to the passed protocol, cid, etc
   */
  async function assertMatchUrl (url: URL, match: { url: URL, cid: string | CID }): Promise<void> {
    const parsed = await resolver.resolve(url, new ServerTiming(), {
      session: false
    })

    expect(parsed.url).to.deep.equal(match.url)
    expect(parsed.terminalElement.cid.toString()).to.equal(match.cid.toString())
  }

  beforeEach(async () => {
    blockstore = new MemoryBlockstore()

    const fs = unixfs({ blockstore })
    txtFileCID = await fs.addBytes(uint8ArrayFromString('hello world\n'))

    const emptyDir = await fs.addDirectory()
    directoryCID = await fs.cp(txtFileCID, emptyDir, '1 - Barrel - Part 1 - alt.txt')
    nestedDirectoryCID = await fs.cp(directoryCID, emptyDir, '1 - Barrel - Part 1')

    ipnsResolver = stubInterface()
    dnsLink = stubInterface()
    helia = stubInterface<Helia>({
      // @ts-expect-error incomplete implementation
      blockstore
    })

    resolver = new URLResolver({
      ipnsResolver,
      dnsLink,
      helia
    })
  })

  describe('invalid URLs', () => {
    it('throws for invalid protocols', async () => {
      await expect(resolver.resolve(new URL('derp://invalid'))).to.eventually.be.rejected
        .with.property('name').that.include('InvalidParametersError')
    })

    it('throws an error if domain has no dnslink entry', async () => {
      dnsLink.resolve.resolves(undefined)

      await expect(resolver.resolve(new URL('dnslink://mydomain.com'))).to.eventually.be.rejected
        .with.property('message', 'Invalid resource. Cannot resolve DNSLink from domain: mydomain.com')
    })
  })

  describe('ipfs://<CID> URLs', async () => {
    it('handles invalid CIDs', async () => {
      await expect(resolver.resolve(new URL('ipfs://QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4i'))).to.eventually.be.rejected
        .with.property('message', 'Invalid CID version 26')
    })

    it('should return an empty path for bare CIDs', async () => {
      const parsed = await resolver.resolve(new URL(`ipfs://${txtFileCID}`), new ServerTiming(), {
        session: false
      })
      expect(parsed.url.toString()).to.equal(`ipfs://${txtFileCID}`)
      expect(parsed).to.have.nested.property('url.pathname', '')
    })

    it('can parse a URL with CID only', async () => {
      await assertMatchUrl(
        new URL(`ipfs://${txtFileCID}`), {
          cid: txtFileCID,
          url: new URL(`ipfs://${txtFileCID}`)
        }
      )
    })

    it('can parse URL with CID+path', async () => {
      await assertMatchUrl(
        new URL(`ipfs://${nestedDirectoryCID}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`), {
          cid: txtFileCID,
          url: new URL(`ipfs://${nestedDirectoryCID}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`)
        }
      )
    })

    it('can parse URL with CID+queryString', async () => {
      await assertMatchUrl(
        new URL(`ipfs://${nestedDirectoryCID}`), {
          cid: nestedDirectoryCID,
          url: new URL(`ipfs://${nestedDirectoryCID}`)
        }
      )
    })

    it('can parse URL with CID, trailing slash and queryString', async () => {
      await assertMatchUrl(
        new URL(`ipfs://${nestedDirectoryCID}/`), {
          cid: nestedDirectoryCID,
          url: new URL(`ipfs://${nestedDirectoryCID}/`)
        }
      )
    })

    it('can parse URL with CID+path+queryString', async () => {
      await assertMatchUrl(
        new URL(`ipfs://${nestedDirectoryCID}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`), {
          cid: txtFileCID,
          url: new URL(`ipfs://${nestedDirectoryCID}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`)
        }
      )
    })
  })

  describe('ipns://<dnsLinkDomain> URLs', () => {
    it('handles invalid DNSLinkDomains', async () => {
      ipnsResolver.resolve.rejects(new Error('Unexpected failure from ipns resolve method'))
      dnsLink.resolve.rejects(new Error('Unexpected failure from ipns dns query'))

      await expect(resolver.resolve(new URL('dnslink://mydomain.com'))).to.eventually.be.rejected
        .with.property('message', 'Unexpected failure from ipns dns query')
    })

    it('can parse a URL with DNSLinkDomain only', async () => {
      dnsLink.resolve.withArgs('mydomain.com').resolves([{
        namespace: 'ipfs',
        cid: txtFileCID,
        path: '',
        answer: stubInterface<Answer>()
      }])

      await assertMatchUrl(
        new URL('dnslink://mydomain.com'), {
          cid: txtFileCID,
          url: new URL('dnslink://mydomain.com')
        }
      )
    })

    it('can parse a URL with DNSLinkDomain+path', async () => {
      dnsLink.resolve.withArgs('mydomain.com').resolves([{
        namespace: 'ipfs',
        cid: nestedDirectoryCID,
        path: '',
        answer: stubInterface<Answer>()
      }])

      await assertMatchUrl(
        new URL('dnslink://mydomain.com/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt'), {
          cid: txtFileCID,
          url: new URL('dnslink://mydomain.com/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt')
        }
      )
    })

    it('can parse a URL with DNSLinkDomain+queryString', async () => {
      dnsLink.resolve.withArgs('mydomain.com').resolves([{
        namespace: 'ipfs',
        cid: txtFileCID,
        path: '',
        answer: stubInterface<Answer>()
      }])

      await assertMatchUrl(
        new URL('dnslink://mydomain.com'), {
          cid: txtFileCID,
          url: new URL('dnslink://mydomain.com')
        }
      )
    })

    it('can parse a URL with DNSLinkDomain+path+queryString', async () => {
      dnsLink.resolve.withArgs('mydomain.com').resolves([{
        namespace: 'ipfs',
        cid: nestedDirectoryCID,
        path: '',
        answer: stubInterface<Answer>()
      }])

      await assertMatchUrl(
        new URL('dnslink://mydomain.com/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt'), {
          cid: txtFileCID,
          url: new URL('dnslink://mydomain.com/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt')
        }
      )
    })

    it('can parse a URL with DNSLinkDomain+directoryPath+queryString', async () => {
      dnsLink.resolve.withArgs('mydomain.com').resolves([{
        namespace: 'ipfs',
        cid: nestedDirectoryCID,
        path: '',
        answer: stubInterface<Answer>()
      }])

      await assertMatchUrl(
        new URL('dnslink://mydomain.com/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt?foo=bar'), {
          cid: txtFileCID,
          url: new URL('dnslink://mydomain.com/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt?foo=bar')
        }
      )
    })
  })

  describe('TTL', () => {
    const oneHourInSeconds = 3600
    const oneHourInNanoseconds = BigInt(3600 * 1e9)

    it('should return the correct TTL from the DNS Answer ', async () => {
      // spell-checker: disable-next-line
      dnsLink.resolve.withArgs('example.com').resolves([{
        namespace: 'ipfs',
        cid: nestedDirectoryCID,
        path: '',
        answer: {
          TTL: oneHourInSeconds,
          type: 16,
          name: 'n/a',
          data: 'n/a'
        }
      }])

      const result = await resolver.resolve(new URL('dnslink://example.com/'), new ServerTiming(), {
        session: false
      })
      expect(result.ttl).to.equal(oneHourInSeconds)
    })

    it('should return the correct TTL from the IPNS answer', async () => {
      const key = await generateKeyPair('Ed25519')
      const testPeerId = peerIdFromPrivateKey(key)

      ipnsResolver.resolve.withArgs(testPeerId).resolves({
        cid: txtFileCID,
        path: '',
        record: ipnsRecordStub({
          peerId: testPeerId,
          ttl: oneHourInNanoseconds
        })
      })

      const result = await resolver.resolve(new URL(`ipns://${testPeerId}`), new ServerTiming(), {
        session: false
      })
      expect(result.ttl).to.equal(oneHourInSeconds)
    })
  })

  describe('ipns://<peerId> URLs', () => {
    let testPeerId: PeerId
    let base36CidPeerId: string

    beforeEach(async () => {
      const key = await generateKeyPair('Ed25519')
      testPeerId = peerIdFromPrivateKey(key)

      base36CidPeerId = key.publicKey.toCID().toString(base36)
    })

    it('handles valid PeerId resolve failures', async () => {
      ipnsResolver.resolve.rejects(new Error('Unexpected failure from ipns resolve method'))
      dnsLink.resolve.rejects(new Error('Unexpected failure from ipns dns query'))

      await expect(resolver.resolve(new URL(`ipns://${testPeerId}`))).to.eventually.be.rejected
        .with.property('message', 'Unexpected failure from ipns resolve method')
    })

    it('can parse a URL with PeerId only', async () => {
      ipnsResolver.resolve.withArgs(testPeerId).resolves({
        cid: txtFileCID,
        path: '',
        record: ipnsRecordStub({ peerId: testPeerId })
      })

      await assertMatchUrl(
        new URL(`ipns://${testPeerId}`), {
          cid: txtFileCID,
          url: new URL(`ipns://${testPeerId}`)
        }
      )
    })

    it('can parse a base36 PeerId CID', async () => {
      ipnsResolver.resolve.withArgs(testPeerId).resolves({
        cid: txtFileCID,
        path: '',
        record: ipnsRecordStub({ peerId: testPeerId })
      })

      await assertMatchUrl(
        new URL(`ipns://${base36CidPeerId}`), {
          cid: txtFileCID,
          url: new URL(`ipns://${base36CidPeerId}`)
        }
      )
    })

    it('can parse a URL with PeerId+path', async () => {
      ipnsResolver.resolve.withArgs(testPeerId).resolves({
        cid: nestedDirectoryCID,
        path: '',
        record: ipnsRecordStub({ peerId: testPeerId })
      })

      await assertMatchUrl(
        new URL(`ipns://${testPeerId}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`), {
          cid: txtFileCID,
          url: new URL(`ipns://${testPeerId}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`)
        }
      )
    })

    it('can parse a URL with PeerId+path with a trailing slash', async () => {
      ipnsResolver.resolve.withArgs(testPeerId).resolves({
        cid: nestedDirectoryCID,
        path: '',
        record: ipnsRecordStub({ peerId: testPeerId })
      })

      await assertMatchUrl(
        new URL(`ipns://${testPeerId}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt/`), {
          cid: txtFileCID,
          url: new URL(`ipns://${testPeerId}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt/`)
        }
      )
    })

    it('can parse a URL with PeerId+queryString', async () => {
      ipnsResolver.resolve.withArgs(testPeerId).resolves({
        cid: txtFileCID,
        path: '',
        record: ipnsRecordStub({ peerId: testPeerId })
      })

      await assertMatchUrl(
        new URL(`ipns://${testPeerId}`), {
          cid: txtFileCID,
          url: new URL(`ipns://${testPeerId}`)
        }
      )
    })

    it('can parse a URL with PeerId+path+queryString', async () => {
      ipnsResolver.resolve.withArgs(testPeerId).resolves({
        cid: nestedDirectoryCID,
        path: '',
        record: ipnsRecordStub({ peerId: testPeerId })
      })

      await assertMatchUrl(
        new URL(`ipns://${testPeerId}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`), {
          cid: txtFileCID,
          url: new URL(`ipns://${testPeerId}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`)
        }
      )
    })

    it('should parse an ipns:// url with a path that resolves to a CID with a path', async () => {
      const key = await generateKeyPair('Ed25519')
      const peerId = peerIdFromPrivateKey(key)
      const recordPath = 'foo'
      const requestPath = '1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt'

      ipnsResolver.resolve.withArgs(peerId).resolves({
        cid: nestedDirectoryCID,
        path: recordPath,
        record: ipnsRecordStub({ peerId: testPeerId })
      })

      await assertMatchUrl(
        new URL(`ipns://${peerId}/${requestPath}`), {
          cid: txtFileCID,
          url: new URL(`ipns://${peerId}/${requestPath}`)
        }
      )
    })

    it('should parse an ipns:// url with a path that resolves to a CID with a path with a trailing slash', async () => {
      const key = await generateKeyPair('Ed25519')
      const peerId = peerIdFromPrivateKey(key)
      const recordPath = 'foo/'
      const requestPath = '1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt'

      ipnsResolver.resolve.withArgs(peerId).resolves({
        cid: nestedDirectoryCID,
        path: recordPath,
        record: ipnsRecordStub({ peerId: testPeerId })
      })

      await assertMatchUrl(
        new URL(`ipns://${peerId}/${requestPath}`), {
          cid: txtFileCID,
          url: new URL(`ipns://${peerId}/${requestPath}`)
        }
      )
    })

    it('should parse an ipns:// url with a path that resolves to a CID with a path with a trailing slash', async () => {
      const key = await generateKeyPair('Ed25519')
      const peerId = peerIdFromPrivateKey(key)
      const recordPath = '/foo/////bar//'
      const requestPath = '1 - Barrel - Part 1////////1 - Barrel - Part 1 - alt.txt'

      ipnsResolver.resolve.withArgs(peerId).resolves({
        cid: nestedDirectoryCID,
        path: recordPath,
        record: ipnsRecordStub({ peerId: testPeerId })
      })

      await assertMatchUrl(
        new URL(`ipns://${peerId}/${requestPath}`), {
          cid: txtFileCID,
          url: new URL(`ipns://${peerId}/${requestPath}`)
        }
      )
    })
  })

  describe('url fragments', () => {
    it('can parse an HTTP URL with a fragment', async () => {
      await assertMatchUrl(
        new URL(`ipfs://${nestedDirectoryCID}/#hello-fragment`), {
          cid: nestedDirectoryCID,
          url: new URL(`ipfs://${nestedDirectoryCID}/#hello-fragment`)
        }
      )
    })

    it('can parse an HTTP URL with a fragment and a path', async () => {
      await assertMatchUrl(
        new URL(`ipfs://${nestedDirectoryCID}/1 - Barrel - Part 1/#hello-fragment`), {
          cid: directoryCID,
          url: new URL(`ipfs://${nestedDirectoryCID}/1 - Barrel - Part 1/#hello-fragment`)
        }
      )
    })

    it('can parse an HTTP URL with a fragment and a path and a query', async () => {
      await assertMatchUrl(
        new URL(`ipfs://${nestedDirectoryCID}/1 - Barrel - Part 1/?foo=bar#hello-fragment`), {
          cid: directoryCID,
          url: new URL(`ipfs://${nestedDirectoryCID}/1 - Barrel - Part 1/?foo=bar#hello-fragment`)
        }
      )
    })
  })
})
