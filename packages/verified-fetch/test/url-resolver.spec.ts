import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { base36 } from 'multiformats/bases/base36'
import { CID } from 'multiformats/cid'
import { stubInterface } from 'sinon-ts'
import { URLResolver } from '../src/url-resolver.js'
import { ipnsRecordStub } from './fixtures/ipns-stubs.js'
import type { ServerTiming } from '../src/utils/server-timing.ts'
import type { DNSLink } from '@helia/dnslink'
import type { IPNSResolver } from '@helia/ipns'
import type { PeerId } from '@libp2p/interface'
import type { Answer } from '@multiformats/dns'
import type { StubbedInstance } from 'sinon-ts'

const HTTP_PROTOCOLS = [
  'http',
  'https'
]

describe('url-resolver', () => {
  let ipnsResolver: StubbedInstance<IPNSResolver>
  let dnsLink: StubbedInstance<DNSLink>
  let timing: StubbedInstance<ServerTiming>
  let resolver: URLResolver

  /**
   * Assert that the passed url is matched to the passed protocol, cid, etc
   */
  async function assertMatchUrl (urlString: string, match: { protocol: string, cid: string, path: string[], fragment?: string, query: any }): Promise<void> {
    const result = await resolver.resolve(urlString)

    expect(result.protocol).to.equal(match.protocol)
    expect(result.cid.toString()).to.equal(match.cid)
    expect(result.path).to.deep.equal(match.path)
    expect(result.query).to.deep.equal(match.query)
    expect(result.fragment).to.deep.equal(match.fragment ?? '')
  }

  beforeEach(() => {
    ipnsResolver = stubInterface()
    dnsLink = stubInterface()
    timing = stubInterface()
    timing.time.callsFake((name, desc, p) => p)

    resolver = new URLResolver({
      ipnsResolver,
      dnsLink,
      timing
    })
  })

  describe('invalid URLs', () => {
    it('throws for invalid URLs', async () => {
      await expect(
        resolver.resolve('invalid')
      ).to.eventually.be.rejected
        .with.property('message').that.include('Invalid URL')
    })

    it('throws for invalid protocols', async () => {
      await expect(
        resolver.resolve('invalid')
      ).to.eventually.be.rejected
        .with.property('message').that.include('Invalid URL')
    })

    it('throws an error if resulting CID is invalid', async () => {
      dnsLink.resolve.resolves(undefined)

      await expect(
        resolver.resolve('ipns://mydomain.com')
      ).to.eventually.be.rejected.with.property('message', 'Invalid resource. Cannot resolve DNSLink from domain: mydomain.com')
    })
  })

  describe('ipfs://<CID> URLs', () => {
    it('handles invalid CIDs', async () => {
      await expect(
        resolver.resolve('ipfs://QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4i')
      ).to.eventually.be.rejected
        .with.property('message', 'Invalid CID version 26')
    })

    it('can parse a URL with CID only', async () => {
      await assertMatchUrl(
        'ipfs://QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr', {
          protocol: 'ipfs',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          path: [],
          query: {}
        }
      )
    })

    it('can parse URL with CID+path', async () => {
      await assertMatchUrl(
        'ipfs://QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt', {
          protocol: 'ipfs',
          cid: 'QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm',
          path: ['1 - Barrel - Part 1', '1 - Barrel - Part 1 - alt.txt'],
          query: {}
        }
      )
    })

    it('can parse URL with CID+queryString', async () => {
      await assertMatchUrl(
        'ipfs://QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm?format=car', {
          protocol: 'ipfs',
          cid: 'QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm',
          path: [],
          query: {
            format: 'car'
          }
        }
      )
    })

    it('can parse URL with CID, trailing slash and queryString', async () => {
      await assertMatchUrl(
        'ipfs://QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm/?format=car', {
          protocol: 'ipfs',
          cid: 'QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm',
          path: [],
          query: {
            format: 'car'
          }
        }
      )
    })

    it('can parse URL with CID+path+queryString', async () => {
      await assertMatchUrl(
        'ipfs://QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt?format=tar', {
          protocol: 'ipfs',
          cid: 'QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm',
          path: ['1 - Barrel - Part 1', '1 - Barrel - Part 1 - alt.txt'],
          query: {
            format: 'tar'
          }
        }
      )
    })
  })

  describe('ipns://<dnsLinkDomain> URLs', () => {
    it('handles invalid DNSLinkDomains', async () => {
      ipnsResolver.resolve.rejects(new Error('Unexpected failure from ipns resolve method'))
      dnsLink.resolve.rejects(new Error('Unexpected failure from ipns dns query'))

      await expect(resolver.resolve('ipns://mydomain.com')).to.eventually.be.rejected
        .with.property('message', 'Unexpected failure from ipns dns query')
    })

    it('can parse a URL with DNSLinkDomain only', async () => {
      dnsLink.resolve.withArgs('mydomain.com').resolves([{
        namespace: 'ipfs',
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        answer: stubInterface<Answer>()
      }])

      await assertMatchUrl(
        'ipns://mydomain.com', {
          protocol: 'ipns',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          path: [],
          query: {}
        }
      )
    })

    it('can parse a URL with DNSLinkDomain+path', async () => {
      dnsLink.resolve.withArgs('mydomain.com').resolves([{
        namespace: 'ipfs',
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        answer: stubInterface<Answer>()
      }])

      await assertMatchUrl(
        'ipns://mydomain.com/some/path/to/file.txt', {
          protocol: 'ipns',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          path: ['some', 'path', 'to', 'file.txt'],
          query: {}
        }
      )
    })

    it('can parse a URL with DNSLinkDomain+queryString', async () => {
      dnsLink.resolve.withArgs('mydomain.com').resolves([{
        namespace: 'ipfs',
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        answer: stubInterface<Answer>()
      }])

      await assertMatchUrl(
        'ipns://mydomain.com?format=json', {
          protocol: 'ipns',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          path: [],
          query: {
            format: 'json'
          }
        }
      )
    })

    it('can parse a URL with DNSLinkDomain+path+queryString', async () => {
      dnsLink.resolve.withArgs('mydomain.com').resolves([{
        namespace: 'ipfs',
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        answer: stubInterface<Answer>()
      }])

      await assertMatchUrl(
        'ipns://mydomain.com/some/path/to/file.txt?format=json', {
          protocol: 'ipns',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          path: ['some', 'path', 'to', 'file.txt'],
          query: {
            format: 'json'
          }
        }
      )
    })

    it('can parse a URL with DNSLinkDomain+directoryPath+queryString', async () => {
      dnsLink.resolve.withArgs('mydomain.com').resolves([{
        namespace: 'ipfs',
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        answer: stubInterface<Answer>()
      }])

      await assertMatchUrl(
        'ipns://mydomain.com/some/path/to/dir/?format=json', {
          protocol: 'ipns',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          path: ['some', 'path', 'to', 'dir'],
          query: {
            format: 'json'
          }
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
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        answer: {
          TTL: oneHourInSeconds,
          type: 16,
          name: 'n/a',
          data: 'n/a'
        }
      }])

      const result = await resolver.resolve('ipns://newdomain.com/')
      expect(result.ttl).to.equal(oneHourInSeconds)
    })

    it('should return the correct TTL from the IPNS answer', async () => {
      const key = await generateKeyPair('Ed25519')
      const testPeerId = peerIdFromPrivateKey(key)

      ipnsResolver.resolve.withArgs(testPeerId).resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        record: ipnsRecordStub({
          peerId: testPeerId,
          ttl: oneHourInNanoseconds
        })
      })

      const result = await resolver.resolve(`ipns://${testPeerId}`)
      expect(result.ttl).to.equal(oneHourInSeconds)
    })
  })

  describe('/ipfs/<CID> URLs', () => {
    it('should parse an IPFS Path with a CID only', async () => {
      await assertMatchUrl(
        '/ipfs/QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm', {
          protocol: 'ipfs',
          cid: 'QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm',
          path: [],
          query: {}
        }
      )
    })

    it('can parse an IPFS Path with CID+path', async () => {
      await assertMatchUrl(
        '/ipfs/QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt', {
          protocol: 'ipfs',
          cid: 'QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm',
          path: ['1 - Barrel - Part 1', '1 - Barrel - Part 1 - alt.txt'],
          query: {}
        }
      )
    })

    it('can parse an IPFS Path with CID+queryString', async () => {
      await assertMatchUrl(
        '/ipfs/QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm?format=car', {
          protocol: 'ipfs',
          cid: 'QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm',
          path: [],
          query: {
            format: 'car'
          }
        }
      )
    })

    it('can parse an IPFS Path with CID+path+queryString', async () => {
      await assertMatchUrl(
        '/ipfs/QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt?format=tar', {
          protocol: 'ipfs',
          cid: 'QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm',
          path: ['1 - Barrel - Part 1', '1 - Barrel - Part 1 - alt.txt'],
          query: {
            format: 'tar'
          }
        }
      )
    })

    // tests for https://github.com/ipfs-shipyard/service-worker-gateway/issues/83 issue
    it('can parse an IPFS path with encodedURIComponents', async () => {
      // spell-checker: disable-next-line
      const rawPathLabel = "Plan_d'exécution_du_second_étage_de_l'hôtel_de_Brionne_(dessin)_De_Cotte_2503c_–_Gallica_2011_(adjusted).jpg.webp"
      await assertMatchUrl(
        `/ipfs/QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr/I/${encodeURIComponent(rawPathLabel)}`, {
          protocol: 'ipfs',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          // path with decoded component
          path: ['I', rawPathLabel],
          query: {}
        }
      )
    })
  })

  describe('http://example.com/ipfs/<CID> URLs', () => {
    it('should parse an IPFS Gateway URL with a CID only', async () => {
      await assertMatchUrl(
        'http://example.com/ipfs/QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm', {
          protocol: 'ipfs',
          cid: 'QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm',
          path: [],
          query: {}
        }
      )
    })

    it('can parse an IPFS Gateway URL with CID+path', async () => {
      await assertMatchUrl(
        'http://example.com/ipfs/QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt', {
          protocol: 'ipfs',
          cid: 'QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm',
          path: ['1 - Barrel - Part 1', '1 - Barrel - Part 1 - alt.txt'],
          query: {}
        }
      )
    })

    it('can parse an IPFS Gateway URL with CID+queryString', async () => {
      await assertMatchUrl(
        'http://example.com/ipfs/QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm?format=car', {
          protocol: 'ipfs',
          cid: 'QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm',
          path: [],
          query: {
            format: 'car'
          }
        }
      )
    })

    it('can parse an IPFS Gateway URL with CID+path+queryString', async () => {
      await assertMatchUrl(
        'http://example.com/ipfs/QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt?format=tar', {
          protocol: 'ipfs',
          cid: 'QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm',
          path: ['1 - Barrel - Part 1', '1 - Barrel - Part 1 - alt.txt'],
          query: {
            format: 'tar'
          }
        }
      )
    })
  })

  describe('http://<CID>.ipfs.example.com URLs', () => {
    it('should parse a IPFS Subdomain Gateway URL with a CID only', async () => {
      await assertMatchUrl(
        'http://QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm.ipfs.example.com', {
          protocol: 'ipfs',
          cid: 'QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm',
          path: [],
          query: {}
        }
      )
    })

    it('can parse a IPFS Subdomain Gateway URL with CID+path', async () => {
      await assertMatchUrl(
        'http://QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm.ipfs.example.com/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt', {
          protocol: 'ipfs',
          cid: 'QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm',
          path: ['1 - Barrel - Part 1', '1 - Barrel - Part 1 - alt.txt'],
          query: {}
        }
      )
    })

    it('can parse a IPFS Subdomain Gateway URL with CID+queryString', async () => {
      await assertMatchUrl(
        'http://QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm.ipfs.example.com?format=car', {
          protocol: 'ipfs',
          cid: 'QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm',
          path: [],
          query: {
            format: 'car'
          }
        }
      )
    })

    it('can parse a IPFS Subdomain Gateway URL with CID+path+queryString', async () => {
      await assertMatchUrl(
        'http://QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm.ipfs.example.com/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt?format=tar', {
          protocol: 'ipfs',
          cid: 'QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm',
          path: ['1 - Barrel - Part 1', '1 - Barrel - Part 1 - alt.txt'],
          query: {
            format: 'tar'
          }
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

    it('handles invalid PeerIds', async () => {
      ipnsResolver.resolve.rejects(new Error('Unexpected failure from ipns resolve method'))
      dnsLink.resolve.rejects(new Error('Unexpected failure from ipns dns query'))

      await expect(resolver.resolve('ipns://123PeerIdIsFake456')).to.eventually.be.rejected
        .with.property('message', 'Unexpected failure from ipns dns query')
    })

    it('handles valid PeerId resolve failures', async () => {
      ipnsResolver.resolve.rejects(new Error('Unexpected failure from ipns resolve method'))
      dnsLink.resolve.rejects(new Error('Unexpected failure from ipns dns query'))

      await expect(resolver.resolve(`ipns://${testPeerId}`)).to.eventually.be.rejected
        .with.property('message', 'Unexpected failure from ipns resolve method')
    })

    it('can parse a URL with PeerId only', async () => {
      ipnsResolver.resolve.withArgs(testPeerId).resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        record: ipnsRecordStub({ peerId: testPeerId })
      })

      await assertMatchUrl(
        `ipns://${testPeerId}`, {
          protocol: 'ipns',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          path: [],
          query: {}
        }
      )
    })

    it('can parse a base36 PeerId CID', async () => {
      ipnsResolver.resolve.withArgs(testPeerId).resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        record: ipnsRecordStub({ peerId: testPeerId })
      })

      await assertMatchUrl(
        `ipns://${base36CidPeerId}`, {
          protocol: 'ipns',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          path: [],
          query: {}
        }
      )
    })

    it('can parse a URL with PeerId+path', async () => {
      ipnsResolver.resolve.withArgs(testPeerId).resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        record: ipnsRecordStub({ peerId: testPeerId })
      })

      await assertMatchUrl(
        `ipns://${testPeerId}/some/path/to/file.txt`, {
          protocol: 'ipns',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          path: ['some', 'path', 'to', 'file.txt'],
          query: {}
        }
      )
    })

    it('can parse a URL with PeerId+path with a trailing slash', async () => {
      ipnsResolver.resolve.withArgs(testPeerId).resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        record: ipnsRecordStub({ peerId: testPeerId })
      })

      await assertMatchUrl(
        `ipns://${testPeerId}/some/path/to/dir/`, {
          protocol: 'ipns',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          path: ['some', 'path', 'to', 'dir'],
          query: {}
        }
      )
    })

    it('can parse a URL with PeerId+queryString', async () => {
      ipnsResolver.resolve.withArgs(testPeerId).resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        record: ipnsRecordStub({ peerId: testPeerId })
      })

      await assertMatchUrl(
        `ipns://${testPeerId}?format=dag-cbor`, {
          protocol: 'ipns',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          path: [],
          query: {
            format: 'dag-cbor'
          }
        }
      )
    })

    it('can parse a URL with PeerId+path+queryString', async () => {
      ipnsResolver.resolve.withArgs(testPeerId).resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        record: ipnsRecordStub({ peerId: testPeerId })
      })

      await assertMatchUrl(
        `ipns://${testPeerId}/some/path/to/file.txt?format=dag-cbor`, {
          protocol: 'ipns',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          path: ['some', 'path', 'to', 'file.txt'],
          query: {
            format: 'dag-cbor'
          }
        }
      )
    })

    it('should parse an ipns:// url with a path that resolves to a CID with a path', async () => {
      const cid = CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr')
      const key = await generateKeyPair('Ed25519')
      const peerId = peerIdFromPrivateKey(key)
      const recordPath = 'foo'
      const requestPath = 'bar/baz.txt'

      ipnsResolver.resolve.withArgs(peerId).resolves({
        cid,
        path: recordPath,
        record: ipnsRecordStub({ peerId: testPeerId })
      })

      await assertMatchUrl(
        `ipns://${peerId}/${requestPath}`, {
          protocol: 'ipns',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          path: [recordPath, ...requestPath.split('/')],
          query: {}
        }
      )
    })

    it('should parse an ipns:// url with a path that resolves to a CID with a path with a trailing slash', async () => {
      const cid = CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr')
      const key = await generateKeyPair('Ed25519')
      const peerId = peerIdFromPrivateKey(key)
      const recordPath = 'foo/'
      const requestPath = 'bar/baz.txt'

      ipnsResolver.resolve.withArgs(peerId).resolves({
        cid,
        path: recordPath,
        record: ipnsRecordStub({ peerId: testPeerId })
      })

      await assertMatchUrl(
        `ipns://${peerId}/${requestPath}`, {
          protocol: 'ipns',
          path: ['foo', ...requestPath.split('/')],
          cid: cid.toString(),
          query: {}
        }
      )
    })

    it('should parse an ipns:// url with a path that resolves to a CID with a path with a trailing slash', async () => {
      const cid = CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr')
      const key = await generateKeyPair('Ed25519')
      const peerId = peerIdFromPrivateKey(key)
      const recordPath = '/foo/////bar//'
      const requestPath = '///baz///qux.txt'

      ipnsResolver.resolve.withArgs(peerId).resolves({
        cid,
        path: recordPath,
        record: ipnsRecordStub({ peerId: testPeerId })
      })

      await assertMatchUrl(
        `ipns://${peerId}/${requestPath}`, {
          protocol: 'ipns',
          path: ['foo', 'bar', 'baz', 'qux.txt'],
          cid: cid.toString(),
          query: {}
        }
      )
    })
  })

  describe('/ipns/<PeerId> URLs', () => {
    let peerId: PeerId
    let cid: CID

    beforeEach(async () => {
      const key = await generateKeyPair('Ed25519')
      peerId = peerIdFromPrivateKey(key)
      cid = CID.parse('QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm')
      ipnsResolver.resolve.withArgs(peerId).resolves({
        cid,
        path: '',
        record: ipnsRecordStub({ peerId })
      })
    })

    it('should parse an IPNS Path with a PeerId only', async () => {
      await assertMatchUrl(
        `/ipns/${peerId}/`, {
          protocol: 'ipns',
          cid: cid.toString(),
          path: [],
          query: {}
        }
      )
    })

    it('can parse an IPNS Path with PeerId+path', async () => {
      await assertMatchUrl(
        `/ipns/${peerId}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`, {
          protocol: 'ipns',
          cid: cid.toString(),
          path: ['1 - Barrel - Part 1', '1 - Barrel - Part 1 - alt.txt'],
          query: {}
        }
      )
    })

    it('can parse an IPNS Path with PeerId+directoryPath', async () => {
      await assertMatchUrl(
        `/ipns/${peerId}/path/to/dir/`, {
          protocol: 'ipns',
          cid: cid.toString(),
          path: ['path', 'to', 'dir'],
          query: {}
        }
      )
    })

    it('can parse an IPNS Path with PeerId+queryString', async () => {
      await assertMatchUrl(
        `/ipns/${peerId}?format=car`, {
          protocol: 'ipns',
          cid: cid.toString(),
          path: [],
          query: {
            format: 'car'
          }
        }
      )
    })

    it('can parse an IPNS Path with PeerId+path+queryString', async () => {
      await assertMatchUrl(
        `/ipns/${peerId}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt?format=tar`, {
          protocol: 'ipns',
          cid: cid.toString(),
          path: ['1 - Barrel - Part 1', '1 - Barrel - Part 1 - alt.txt'],
          query: {
            format: 'tar'
          }
        }
      )
    })

    it('can parse an IPNS Path with PeerId+directoryPath+queryString', async () => {
      await assertMatchUrl(
        `/ipns/${peerId}/path/to/dir/?format=tar`, {
          protocol: 'ipns',
          cid: cid.toString(),
          path: ['path', 'to', 'dir'],
          query: {
            format: 'tar'
          }
        }
      )
    })
  })

  HTTP_PROTOCOLS.forEach(proto => {
    describe(`${proto}://example.com/ipfs/<CID> URLs`, () => {
      let peerId: PeerId
      let cid: CID

      beforeEach(async () => {
        const key = await generateKeyPair('Ed25519')
        peerId = peerIdFromPrivateKey(key)
        cid = CID.parse('QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm')
        ipnsResolver.resolve.withArgs(peerId).resolves({
          cid,
          path: '',
          record: ipnsRecordStub({ peerId })
        })
      })

      it('should parse an IPFS Gateway URL with a CID only', async () => {
        await assertMatchUrl(
          `${proto}://example.com/ipns/${peerId}`, {
            protocol: 'ipns',
            cid: cid.toString(),
            path: [],
            query: {}
          }
        )
      })

      it('can parse an IPNS Gateway URL with CID+path', async () => {
        await assertMatchUrl(
          `${proto}://example.com/ipns/${peerId}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`, {
            protocol: 'ipns',
            cid: cid.toString(),
            path: ['1 - Barrel - Part 1', '1 - Barrel - Part 1 - alt.txt'],
            query: {}
          }
        )
      })

      it('can parse an IPNS Gateway URL with CID+directoryPath', async () => {
        await assertMatchUrl(
          `${proto}://example.com/ipns/${peerId}/path/to/dir/`, {
            protocol: 'ipns',
            cid: cid.toString(),
            path: ['path', 'to', 'dir'],
            query: {}
          }
        )
      })

      it('can parse an IPNS Gateway URL with CID+queryString', async () => {
        await assertMatchUrl(
          `${proto}://example.com/ipns/${peerId}?format=car`, {
            protocol: 'ipns',
            cid: cid.toString(),
            path: [],
            query: {
              format: 'car'
            }
          }
        )
      })

      it('can parse an IPNS Gateway URL with CID+path+queryString', async () => {
        await assertMatchUrl(
          `${proto}://example.com/ipns/${peerId}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt?format=tar`, {
            protocol: 'ipns',
            cid: cid.toString(),
            path: ['1 - Barrel - Part 1', '1 - Barrel - Part 1 - alt.txt'],
            query: {
              format: 'tar'
            }
          }
        )
      })

      it('can parse an IPNS Gateway URL with CID+directoryPath+queryString', async () => {
        await assertMatchUrl(
          `${proto}://example.com/ipns/${peerId}/path/to/dir/?format=tar`, {
            protocol: 'ipns',
            cid: cid.toString(),
            path: ['path', 'to', 'dir'],
            query: {
              format: 'tar'
            }
          }
        )
      })
    })
  })

  const IPNS_TYPES = [
    ['dnslink-encoded', (i: number) => `${i}-example-com`],
    ['dnslink-decoded', (i: number) => `${i}.example.com`],
    ['peerid', async () => {
      const key = await generateKeyPair('Ed25519')
      return peerIdFromPrivateKey(key)
    }]
  ] as const

  IPNS_TYPES.flatMap(([type, fn]) => {
    // merge IPNS_TYPES with HTTP_PROTOCOLS
    return HTTP_PROTOCOLS.reduce<Array<[string, string, (i: number) => string | Promise<PeerId>]>>((acc, proto) => {
      acc.push([proto, type, fn])
      return acc
    }, [])
  }, []).forEach(([proto, type, getVal]) => {
    describe(`${proto}://<${type}>.ipns.example.com URLs`, () => {
      let value: PeerId | string
      let cid: CID
      let i = 0
      beforeEach(async () => {
        value = await getVal(i++)
        cid = CID.parse('QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm')
        if (type === 'peerid') {
          ipnsResolver.resolve.withArgs((value as PeerId)).resolves({
            cid,
            path: '',
            record: ipnsRecordStub({ peerId: value as PeerId })
          })
        } else if (type === 'dnslink-encoded') {
          dnsLink.resolve.withArgs(value.toString().replace(/-/g, '.')).resolves([{
            namespace: 'ipfs',
            cid,
            path: '',
            answer: stubInterface<Answer>()
          }])
        } else {
          dnsLink.resolve.withArgs(value.toString()).resolves([{
            namespace: 'ipfs',
            cid,
            path: '',
            answer: stubInterface<Answer>()
          }])
        }
      })

      it('should parse a IPNS Subdomain Gateway URL with a CID only', async () => {
        await assertMatchUrl(
          `${proto}://${value.toString()}.ipns.example.com`, {
            protocol: 'ipns',
            cid: cid.toString(),
            path: [],
            query: {}
          }
        )
      })

      it('can parse a IPNS Subdomain Gateway URL with CID+path', async () => {
        await assertMatchUrl(
          `${proto}://${value.toString()}.ipns.example.com/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`, {
            protocol: 'ipns',
            cid: cid.toString(),
            path: ['1 - Barrel - Part 1', '1 - Barrel - Part 1 - alt.txt'],
            query: {}
          }
        )
      })

      it('can parse a IPNS Subdomain Gateway URL with CID+directoryPath', async () => {
        await assertMatchUrl(
          `${proto}://${value.toString()}.ipns.example.com/path/to/dir/`, {
            protocol: 'ipns',
            cid: cid.toString(),
            path: ['path', 'to', 'dir'],
            query: {}
          }
        )
      })

      it('can parse a IPNS Subdomain Gateway URL with CID+queryString', async () => {
        await assertMatchUrl(
          `${proto}://${value.toString()}.ipns.example.com?format=car`, {
            protocol: 'ipns',
            cid: cid.toString(),
            path: [],
            query: {
              format: 'car'
            }
          }
        )
      })

      it('can parse a IPNS Subdomain Gateway URL with CID+path+queryString', async () => {
        await assertMatchUrl(
          `${proto}://${value.toString()}.ipns.example.com/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt?format=tar`, {
            protocol: 'ipns',
            cid: cid.toString(),
            path: ['1 - Barrel - Part 1', '1 - Barrel - Part 1 - alt.txt'],
            query: {
              format: 'tar'
            }
          }
        )
      })

      it('can parse a IPNS Subdomain Gateway URL with CID+directoryPath+queryString', async () => {
        await assertMatchUrl(
          `${proto}://${value.toString()}.ipns.example.com/path/to/dir/?format=tar`, {
            protocol: 'ipns',
            cid: cid.toString(),
            path: ['path', 'to', 'dir'],
            query: {
              format: 'tar'
            }
          }
        )
      })
    })
  })

  describe('subdomainURLs with paths', () => {
    it('should correctly parse a subdomain that also has /ipfs in the path', async () => {
      // straight from gateway-conformance test: http://bafkreicysg23kiwv34eg2d7qweipxwosdo2py4ldv42nbauguluen5v6am.ipfs.localhost:3441/ipfs/bafkreicysg23kiwv34eg2d7qweipxwosdo2py4ldv42nbauguluen5v6am
      await assertMatchUrl(
        'http://bafkreicysg23kiwv34eg2d7qweipxwosdo2py4ldv42nbauguluen5v6am.ipfs.localhost:3441/ipfs/bafkreicysg23kiwv34eg2d7qweipxwosdo2py4ldv42nbauguluen5v6am', {
          protocol: 'ipfs',
          cid: 'bafkreicysg23kiwv34eg2d7qweipxwosdo2py4ldv42nbauguluen5v6am',
          path: ['ipfs', 'bafkreicysg23kiwv34eg2d7qweipxwosdo2py4ldv42nbauguluen5v6am'],
          query: {}
        }
      )
    })
  })

  describe('url fragments', () => {
    it('can parse an HTTP URL with a fragment', async () => {
      await assertMatchUrl(
        'http://bafkreicysg23kiwv34eg2d7qweipxwosdo2py4ldv42nbauguluen5v6am.ipfs.localhost:1234/#hello-fragment', {
          protocol: 'ipfs',
          cid: 'bafkreicysg23kiwv34eg2d7qweipxwosdo2py4ldv42nbauguluen5v6am',
          path: [],
          fragment: 'hello-fragment',
          query: {}
        }
      )
    })

    it('can parse an HTTP URL with a fragment and a path', async () => {
      await assertMatchUrl(
        'http://bafkreicysg23kiwv34eg2d7qweipxwosdo2py4ldv42nbauguluen5v6am.ipfs.localhost:1234/path/to/dir/#hello-fragment', {
          protocol: 'ipfs',
          cid: 'bafkreicysg23kiwv34eg2d7qweipxwosdo2py4ldv42nbauguluen5v6am',
          path: ['path', 'to', 'dir'],
          fragment: 'hello-fragment',
          query: {}
        }
      )
    })

    it('can parse an HTTP URL with a fragment and a path and a query', async () => {
      await assertMatchUrl(
        'http://bafkreicysg23kiwv34eg2d7qweipxwosdo2py4ldv42nbauguluen5v6am.ipfs.localhost:1234/path/to/dir/?format=tar#hello-fragment', {
          protocol: 'ipfs',
          cid: 'bafkreicysg23kiwv34eg2d7qweipxwosdo2py4ldv42nbauguluen5v6am',
          path: ['path', 'to', 'dir'],
          fragment: 'hello-fragment',
          query: {
            format: 'tar'
          }
        }
      )
    })
  })
})
