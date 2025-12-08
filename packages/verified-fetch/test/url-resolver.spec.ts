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

const HTTP_PROTOCOLS = [
  'http',
  'https'
]

describe('url-resolver', () => {
  let ipnsResolver: StubbedInstance<IPNSResolver>
  let dnsLink: StubbedInstance<DNSLink>
  let helia: StubbedInstance<Helia>
  let resolver: URLResolver
  let blockstore: Blockstore

  let txtFileCID: CID
  let nestedDirectoryCID: CID
  let directoryCID: CID
  let unicodeDirectoryCID: CID
  let nestedDirectoryWithIPFSSegmentCID: CID

  /**
   * Assert that the passed url is matched to the passed protocol, cid, etc
   */
  async function assertMatchUrl (urlString: string, match: { url: URL, cid: string | CID }): Promise<void> {
    const parsed = await resolver.resolve(new URL(urlString), new ServerTiming(), {
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

    const iDirectoryCID = await fs.cp(txtFileCID, emptyDir, "Plan_d'exécution_du_second_étage_de_l'hôtel_de_Brionne_(dessin)_De_Cotte_2503c_–_Gallica_2011_(adjusted).jpg.webp")
    unicodeDirectoryCID = await fs.cp(iDirectoryCID, emptyDir, 'I')

    const ipfsDir = await fs.cp(txtFileCID, emptyDir, 'bafkreicysg23kiwv34eg2d7qweipxwosdo2py4ldv42nbauguluen5v6am')
    nestedDirectoryWithIPFSSegmentCID = await fs.cp(ipfsDir, emptyDir, 'ipfs')

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
        `ipfs://${txtFileCID}`, {
          cid: txtFileCID,
          url: new URL(`ipfs://${txtFileCID}`)
        }
      )
    })

    it('can parse URL with CID+path', async () => {
      await assertMatchUrl(
        `ipfs://${nestedDirectoryCID}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`, {
          cid: txtFileCID,
          url: new URL(`ipfs://${nestedDirectoryCID}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`)
        }
      )
    })

    it('can parse URL with CID+queryString', async () => {
      await assertMatchUrl(
        `ipfs://${nestedDirectoryCID}`, {
          cid: nestedDirectoryCID,
          url: new URL(`ipfs://${nestedDirectoryCID}`)
        }
      )
    })

    it('can parse URL with CID, trailing slash and queryString', async () => {
      await assertMatchUrl(
        `ipfs://${nestedDirectoryCID}/`, {
          cid: nestedDirectoryCID,
          url: new URL(`ipfs://${nestedDirectoryCID}/`)
        }
      )
    })

    it('can parse URL with CID+path+queryString', async () => {
      await assertMatchUrl(
        `ipfs://${nestedDirectoryCID}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`, {
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
        'dnslink://mydomain.com', {
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
        'dnslink://mydomain.com/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt', {
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
        'dnslink://mydomain.com', {
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
        'dnslink://mydomain.com/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt', {
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
        'dnslink://mydomain.com/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt?foo=bar', {
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
      dnsLink.resolve.withArgs('newdomain.com').resolves([{
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

      const result = await resolver.resolve(new URL('dnslink://newdomain.com/'), new ServerTiming(), {
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

  describe.skip('/ipfs/<CID> URLs', () => {
    it('should parse an IPFS Path with a CID only', async () => {
      await assertMatchUrl(
        `/ipfs/${nestedDirectoryCID}`, {
          cid: nestedDirectoryCID,
          url: new URL(`ipfs://${nestedDirectoryCID}`)
        }
      )
    })

    it('can parse an IPFS Path with CID+path', async () => {
      await assertMatchUrl(
        `/ipfs/${nestedDirectoryCID}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`, {
          cid: txtFileCID,
          url: new URL(`ipfs://${nestedDirectoryCID}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`)
        }
      )
    })

    it('can parse an IPFS Path with CID+queryString', async () => {
      await assertMatchUrl(
        `/ipfs/${nestedDirectoryCID}`, {
          cid: nestedDirectoryCID,
          url: new URL(`ipfs://${nestedDirectoryCID}`)
        }
      )
    })

    it('can parse an IPFS Path with CID+path+queryString', async () => {
      await assertMatchUrl(
        `/ipfs/${nestedDirectoryCID}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`, {
          cid: txtFileCID,
          url: new URL(`ipfs://${nestedDirectoryCID}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`)
        }
      )
    })

    // tests for https://github.com/ipfs-shipyard/service-worker-gateway/issues/83 issue
    it('can parse an IPFS path with encodedURIComponents', async () => {
      // spell-checker: disable-next-line
      const rawPathLabel = "Plan_d'exécution_du_second_étage_de_l'hôtel_de_Brionne_(dessin)_De_Cotte_2503c_–_Gallica_2011_(adjusted).jpg.webp"
      await assertMatchUrl(
        `/ipfs/${unicodeDirectoryCID}/I/${encodeURIComponent(rawPathLabel)}`, {
          cid: txtFileCID,
          url: new URL(`ipfs://${unicodeDirectoryCID}/I/${encodeURIComponent(rawPathLabel)}`)
        }
      )
    })
  })

  describe.skip('http://example.com/ipfs/<CID> URLs', () => {
    it('should parse an IPFS Gateway URL with a CID only', async () => {
      await assertMatchUrl(
        `http://example.com/ipfs/${nestedDirectoryCID}`, {
          cid: nestedDirectoryCID,
          url: new URL(`ipfs://${nestedDirectoryCID}`)
        }
      )
    })

    it('can parse an IPFS Gateway URL with CID+path', async () => {
      await assertMatchUrl(
        `http://example.com/ipfs/${nestedDirectoryCID}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`, {
          cid: txtFileCID,
          url: new URL(`ipfs://${nestedDirectoryCID}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`)
        }
      )
    })

    it('can parse an IPFS Gateway URL with CID+queryString', async () => {
      await assertMatchUrl(
        `http://example.com/ipfs/${nestedDirectoryCID}`, {
          cid: nestedDirectoryCID,
          url: new URL(`ipfs://${nestedDirectoryCID}`)
        }
      )
    })

    it('can parse an IPFS Gateway URL with CID+path+queryString', async () => {
      await assertMatchUrl(
        `http://example.com/ipfs/${nestedDirectoryCID}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`, {
          cid: txtFileCID,
          url: new URL(`ipfs://${nestedDirectoryCID}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`)
        }
      )
    })
  })

  describe.skip('http://<CID>.ipfs.example.com URLs', () => {
    it('should parse a IPFS Subdomain Gateway URL with a CID only', async () => {
      await assertMatchUrl(
        `http://${nestedDirectoryCID}.ipfs.example.com`, {
          cid: nestedDirectoryCID,
          url: new URL(`ipfs://${nestedDirectoryCID}`)
        }
      )
    })

    it('can parse a IPFS Subdomain Gateway URL with CID+path', async () => {
      await assertMatchUrl(
        `http://${nestedDirectoryCID}.ipfs.example.com/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`, {
          cid: txtFileCID,
          url: new URL(`ipfs://${nestedDirectoryCID}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`)
        }
      )
    })

    it('can parse a IPFS Subdomain Gateway URL with CID+queryString', async () => {
      await assertMatchUrl(
        `http://${nestedDirectoryCID}.ipfs.example.com?foo=bar`, {
          cid: nestedDirectoryCID,
          url: new URL(`ipfs://${nestedDirectoryCID}?foo=bar`)
        }
      )
    })

    it('can parse a IPFS Subdomain Gateway URL with CID+path+queryString', async () => {
      await assertMatchUrl(
        `http://${nestedDirectoryCID}.ipfs.example.com/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt?foo=bar`, {
          cid: txtFileCID,
          url: new URL(`ipfs://${nestedDirectoryCID}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt?foo=bar`)
        }
      )
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
        `ipns://${testPeerId}`, {
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
        `ipns://${base36CidPeerId}`, {
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
        `ipns://${testPeerId}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`, {
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
        `ipns://${testPeerId}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt/`, {
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
        `ipns://${testPeerId}`, {
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
        `ipns://${testPeerId}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`, {
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
        `ipns://${peerId}/${requestPath}`, {
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
        `ipns://${peerId}/${requestPath}`, {
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
        `ipns://${peerId}/${requestPath}`, {
          cid: txtFileCID,
          url: new URL(`ipns://${peerId}/${requestPath}`)
        }
      )
    })
  })

  describe.skip('/ipns/<PeerId> URLs', () => {
    let peerId: PeerId

    beforeEach(async () => {
      const key = await generateKeyPair('Ed25519')
      peerId = peerIdFromPrivateKey(key)

      ipnsResolver.resolve.withArgs(peerId).resolves({
        cid: nestedDirectoryCID,
        path: '',
        record: ipnsRecordStub({ peerId })
      })
    })

    it('should parse an IPNS Path with a PeerId only', async () => {
      await assertMatchUrl(
        `/ipns/${peerId}/`, {
          cid: nestedDirectoryCID,
          url: new URL(`ipns://${peerId}/`)
        }
      )
    })

    it('can parse an IPNS Path with PeerId+path', async () => {
      await assertMatchUrl(
        `/ipns/${peerId}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`, {
          cid: txtFileCID,
          url: new URL(`ipns://${peerId}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`)
        }
      )
    })

    it('can parse an IPNS Path with PeerId+directoryPath', async () => {
      await assertMatchUrl(
        `/ipns/${peerId}/1 - Barrel - Part 1/`, {
          cid: directoryCID,
          url: new URL(`ipns://${peerId}/1 - Barrel - Part 1/`)
        }
      )
    })

    it('can parse an IPNS Path with PeerId', async () => {
      await assertMatchUrl(
        `/ipns/${peerId}`, {
          cid: nestedDirectoryCID,
          url: new URL(`ipns://${peerId}`)
        }
      )
    })

    it('can parse an IPNS Path with PeerId+path', async () => {
      await assertMatchUrl(
        `/ipns/${peerId}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`, {
          cid: txtFileCID,
          url: new URL(`ipns://${peerId}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`)
        }
      )
    })

    it('can parse an IPNS Path with PeerId+directoryPath', async () => {
      await assertMatchUrl(
        `/ipns/${peerId}/1 - Barrel - Part 1/`, {
          cid: directoryCID,
          url: new URL(`ipns://${peerId}/1 - Barrel - Part 1/`)
        }
      )
    })
  })

  HTTP_PROTOCOLS.forEach(proto => {
    describe.skip(`${proto}://example.com/ipfs/<CID> URLs`, () => {
      let peerId: PeerId

      beforeEach(async () => {
        const key = await generateKeyPair('Ed25519')
        peerId = peerIdFromPrivateKey(key)

        ipnsResolver.resolve.withArgs(peerId).resolves({
          cid: nestedDirectoryCID,
          path: '',
          record: ipnsRecordStub({ peerId })
        })
      })

      it('should parse an IPFS Gateway URL with a CID only', async () => {
        await assertMatchUrl(
          `${proto}://example.com/ipns/${peerId}`, {
            cid: nestedDirectoryCID,
            url: new URL(`ipns://${peerId}`)
          }
        )
      })

      it('can parse an IPNS Gateway URL with CID+path', async () => {
        await assertMatchUrl(
          `${proto}://example.com/ipns/${peerId}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`, {
            cid: txtFileCID,
            url: new URL(`ipns://${peerId}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`)
          }
        )
      })

      it('can parse an IPNS Gateway URL with CID+directoryPath', async () => {
        await assertMatchUrl(
          `${proto}://example.com/ipns/${peerId}/1 - Barrel - Part 1/`, {
            cid: directoryCID,
            url: new URL(`ipns://${peerId}/1 - Barrel - Part 1/`)
          }
        )
      })

      it('can parse an IPNS Gateway URL with CID', async () => {
        await assertMatchUrl(
          `${proto}://example.com/ipns/${peerId}`, {
            cid: nestedDirectoryCID,
            url: new URL(`ipns://${peerId}`)
          }
        )
      })

      it('can parse an IPNS Gateway URL with CID+path+queryString', async () => {
        await assertMatchUrl(
          `${proto}://example.com/ipns/${peerId}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`, {
            cid: txtFileCID,
            url: new URL(`ipns://${peerId}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`)
          }
        )
      })

      it('can parse an IPNS Gateway URL with CID+directoryPath', async () => {
        await assertMatchUrl(
          `${proto}://example.com/ipns/${peerId}/1 - Barrel - Part 1/`, {
            cid: directoryCID,
            url: new URL(`ipns://${peerId}/1 - Barrel - Part 1/`)
          }
        )
      })
    })
  })

  const IPNS_TYPES = [
    ['dnslink-encoded', (i: number) => `${i}-example-com`, (val: string) => val.replace(/-/g, '.')],
    ['dnslink-decoded', (i: number) => `${i}.example.com`, (val: string) => val],
    ['peerid', async () => {
      const key = await generateKeyPair('Ed25519')
      return peerIdFromPrivateKey(key)
    }, (val: string) => val]
  ] as const

  IPNS_TYPES.flatMap(([type, fn, decodedFn]) => {
    // merge IPNS_TYPES with HTTP_PROTOCOLS
    return HTTP_PROTOCOLS.reduce<Array<[string, string, (i: number) => string | Promise<PeerId>, (val: string) => string]>>((acc, proto) => {
      acc.push([proto, type, fn, decodedFn])
      return acc
    }, [])
  }, []).forEach(([proto, type, getVal, getDecoded]) => {
    describe.skip(`${proto}://<${type}>.ipns.example.com URLs`, () => {
      let value: PeerId | string
      let i = 0
      let protocol: string
      beforeEach(async () => {
        value = await getVal(i++)

        protocol = 'ipns'

        if (type === 'peerid') {
          ipnsResolver.resolve.withArgs((value as PeerId)).resolves({
            cid: nestedDirectoryCID,
            path: '',
            record: ipnsRecordStub({ peerId: value as PeerId })
          })
        } else if (type === 'dnslink-encoded') {
          protocol = 'dnslink'
          dnsLink.resolve.withArgs(value.toString().replace(/-/g, '.')).resolves([{
            namespace: 'ipfs',
            cid: nestedDirectoryCID,
            path: '',
            answer: stubInterface<Answer>()
          }])
        } else {
          protocol = 'dnslink'
          dnsLink.resolve.withArgs(value.toString()).resolves([{
            namespace: 'ipfs',
            cid: nestedDirectoryCID,
            path: '',
            answer: stubInterface<Answer>()
          }])
        }
      })

      it('should parse a IPNS Subdomain Gateway URL with a CID only', async () => {
        await assertMatchUrl(
          `${proto}://${value}.ipns.example.com`, {
            cid: nestedDirectoryCID,
            url: new URL(`${protocol}://${getDecoded(value.toString())}`)
          }
        )
      })

      it('can parse a IPNS Subdomain Gateway URL with CID+path', async () => {
        await assertMatchUrl(
          `${proto}://${value}.ipns.example.com/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`, {
            cid: txtFileCID,
            url: new URL(`${protocol}://${getDecoded(value.toString())}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`)
          }
        )
      })

      it('can parse a IPNS Subdomain Gateway URL with CID+directoryPath', async () => {
        await assertMatchUrl(
          `${proto}://${value.toString()}.ipns.example.com/1 - Barrel - Part 1/`, {
            cid: directoryCID,
            url: new URL(`${protocol}://${getDecoded(value.toString())}/1 - Barrel - Part 1/`)
          }
        )
      })

      it('can parse a IPNS Subdomain Gateway URL with CID+queryString', async () => {
        await assertMatchUrl(
          `${proto}://${value.toString()}.ipns.example.com`, {
            cid: nestedDirectoryCID,
            url: new URL(`${protocol}://${getDecoded(value.toString())}`)
          }
        )
      })

      it('can parse a IPNS Subdomain Gateway URL with CID+path+queryString', async () => {
        await assertMatchUrl(
          `${proto}://${value.toString()}.ipns.example.com/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`, {
            cid: txtFileCID,
            url: new URL(`${protocol}://${getDecoded(value.toString())}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`)
          }
        )
      })

      it('can parse a IPNS Subdomain Gateway URL with CID+directoryPath+queryString', async () => {
        await assertMatchUrl(
          `${proto}://${value}.ipns.example.com/1 - Barrel - Part 1/`, {
            cid: directoryCID,
            url: new URL(`${protocol}://${getDecoded(value.toString())}/1 - Barrel - Part 1/`)
          }
        )
      })
    })
  })

  describe.skip('subdomainURLs with paths', () => {
    it('should correctly parse a subdomain that also has /ipfs in the path', async () => {
      // straight from gateway-conformance test: http://bafkreicysg23kiwv34eg2d7qweipxwosdo2py4ldv42nbauguluen5v6am.ipfs.localhost:3441/ipfs/bafkreicysg23kiwv34eg2d7qweipxwosdo2py4ldv42nbauguluen5v6am
      await assertMatchUrl(
        `http://${nestedDirectoryWithIPFSSegmentCID}.ipfs.localhost:3441/ipfs/bafkreicysg23kiwv34eg2d7qweipxwosdo2py4ldv42nbauguluen5v6am`, {
          cid: txtFileCID,
          url: new URL(`ipfs://${nestedDirectoryWithIPFSSegmentCID}/ipfs/bafkreicysg23kiwv34eg2d7qweipxwosdo2py4ldv42nbauguluen5v6am`)
        }
      )
    })
  })

  describe.skip('url fragments', () => {
    it('can parse an HTTP URL with a fragment', async () => {
      await assertMatchUrl(
        `http://${nestedDirectoryCID}.ipfs.localhost:1234/#hello-fragment`, {
          cid: nestedDirectoryCID,
          url: new URL(`ipfs://${nestedDirectoryCID}/#hello-fragment`)
        }
      )
    })

    it('can parse an HTTP URL with a fragment and a path', async () => {
      await assertMatchUrl(
        `http://${nestedDirectoryCID}.ipfs.localhost:1234/1 - Barrel - Part 1/#hello-fragment`, {
          cid: directoryCID,
          url: new URL(`ipfs://${nestedDirectoryCID}/1 - Barrel - Part 1/#hello-fragment`)
        }
      )
    })

    it('can parse an HTTP URL with a fragment and a path and a query', async () => {
      await assertMatchUrl(
        `http://${nestedDirectoryCID}.ipfs.localhost:1234/1 - Barrel - Part 1/?foo=bar#hello-fragment`, {
          cid: directoryCID,
          url: new URL(`ipfs://${nestedDirectoryCID}/1 - Barrel - Part 1/?foo=bar#hello-fragment`)
        }
      )
    })
  })
})
