import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { type Answer } from '@multiformats/dns'
import { expect } from 'aegir/chai'
import { base36 } from 'multiformats/bases/base36'
import { CID } from 'multiformats/cid'
import { stubInterface } from 'sinon-ts'
import { parseUrlString } from '../../src/utils/parse-url-string.js'
import { ipnsRecordStub } from '../fixtures/ipns-stubs.js'
import type { IPNS } from '@helia/ipns'
import type { ComponentLogger, PeerId } from '@libp2p/interface'
import type { StubbedInstance } from 'sinon-ts'

const HTTP_PROTOCOLS = [
  'http',
  'https'
]

describe('parseUrlString', () => {
  let logger: ComponentLogger
  let ipns: StubbedInstance<IPNS>

  /**
   * Assert that the passed url is matched to the passed protocol, cid, etc
   */
  async function assertMatchUrl (urlString: string, match: { protocol: string, cid: string, path: string, query: any }): Promise<void> {
    const result = await parseUrlString({
      urlString,
      ipns,
      logger
    })

    expect(result.protocol).to.equal(match.protocol)
    expect(result.cid.toString()).to.equal(match.cid)
    expect(result.path).to.equal(match.path)
    expect(result.query).to.deep.equal(match.query)
  }

  beforeEach(() => {
    logger = defaultLogger()
    ipns = stubInterface<IPNS>()
  })

  describe('invalid URLs', () => {
    it('throws for invalid URLs', async () => {
      await expect(
        parseUrlString({
          urlString: 'invalid',
          ipns,
          logger
        })
      ).to.eventually.be.rejected
        .with.property('message', 'Invalid URL: invalid, please use ipfs://, ipns://, or gateway URLs only')
    })

    it('throws for invalid protocols', async () => {
      await expect(
        parseUrlString({
          urlString: 'invalid',
          ipns,
          logger
        })
      ).to.eventually.be.rejected
        .with.property('message', 'Invalid URL: invalid, please use ipfs://, ipns://, or gateway URLs only')
    })

    it('throws an error if resulting CID is invalid', async () => {
      // @ts-expect-error - purposefully invalid response
      ipns.resolveDns.returns(null)

      await expect(
        parseUrlString({
          urlString: 'ipns://mydomain.com',
          ipns,
          logger
        })
      ).to.eventually.be.rejected.with.property('message', 'Could not parse PeerId in ipns url "mydomain.com", To parse non base32, base36 or base58btc encoded CID multibase decoder must be provided')
    })
  })

  describe('ipfs://<CID> URLs', () => {
    it('handles invalid CIDs', async () => {
      await expect(
        parseUrlString({
          urlString: 'ipfs://QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4i',
          ipns,
          logger
        })
      ).to.eventually.be.rejected
        .with.property('message', 'Invalid CID for ipfs://<cid> URL')
    })

    it('can parse a URL with CID only', async () => {
      await assertMatchUrl(
        'ipfs://QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr', {
          protocol: 'ipfs',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          path: '',
          query: {}
        }
      )
    })

    it('can parse URL with CID+path', async () => {
      await assertMatchUrl(
        'ipfs://QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt', {
          protocol: 'ipfs',
          cid: 'QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm',
          path: '1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt',
          query: {}
        }
      )
    })

    it('can parse URL with CID+queryString', async () => {
      await assertMatchUrl(
        'ipfs://QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm?format=car', {
          protocol: 'ipfs',
          cid: 'QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm',
          path: '',
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
          path: '',
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
          path: '1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt',
          query: {
            format: 'tar'
          }
        }
      )
    })
  })

  describe('ipns://<dnsLinkDomain> URLs', () => {
    it('handles invalid DNSLinkDomains', async () => {
      ipns.resolve.rejects(new Error('Unexpected failure from ipns resolve method'))
      ipns.resolveDNSLink.rejects(new Error('Unexpected failure from ipns dns query'))

      await expect(parseUrlString({ urlString: 'ipns://mydomain.com', ipns, logger })).to.eventually.be.rejected
        .and.deep.equal([
          new TypeError('Could not parse PeerId in ipns url "mydomain.com", To parse non base32, base36 or base58btc encoded CID multibase decoder must be provided'),
          new Error('Unexpected failure from ipns dns query'),
          new Error('Invalid resource. Cannot determine CID from URL "ipns://mydomain.com".')
        ])
    })

    it('can parse a URL with DNSLinkDomain only', async () => {
      ipns.resolveDNSLink.withArgs('mydomain.com').resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        answer: stubInterface<Answer>()
      })

      await assertMatchUrl(
        'ipns://mydomain.com', {
          protocol: 'ipns',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          path: '',
          query: {}
        }
      )
    })

    it('can parse a URL with DNSLinkDomain+path', async () => {
      ipns.resolveDNSLink.withArgs('mydomain.com').resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        answer: stubInterface<Answer>()
      })

      await assertMatchUrl(
        'ipns://mydomain.com/some/path/to/file.txt', {
          protocol: 'ipns',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          path: 'some/path/to/file.txt',
          query: {}
        }
      )
    })

    it('can parse a URL with DNSLinkDomain+queryString', async () => {
      ipns.resolveDNSLink.withArgs('mydomain.com').resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        answer: stubInterface<Answer>()
      })

      await assertMatchUrl(
        'ipns://mydomain.com?format=json', {
          protocol: 'ipns',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          path: '',
          query: {
            format: 'json'
          }
        }
      )
    })

    it('can parse a URL with DNSLinkDomain+path+queryString', async () => {
      ipns.resolveDNSLink.withArgs('mydomain.com').resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        answer: stubInterface<Answer>()
      })

      await assertMatchUrl(
        'ipns://mydomain.com/some/path/to/file.txt?format=json', {
          protocol: 'ipns',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          path: 'some/path/to/file.txt',
          query: {
            format: 'json'
          }
        }
      )
    })

    it('can parse a URL with DNSLinkDomain+directoryPath+queryString', async () => {
      ipns.resolveDNSLink.withArgs('mydomain.com').resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        answer: stubInterface<Answer>()
      })

      await assertMatchUrl(
        'ipns://mydomain.com/some/path/to/dir/?format=json', {
          protocol: 'ipns',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          path: 'some/path/to/dir/',
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
      ipns.resolveDNSLink.withArgs('newdomain.com').resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        answer: {
          TTL: oneHourInSeconds,
          type: 16,
          name: 'n/a',
          data: 'n/a'
        }
      })

      const result = await parseUrlString({ urlString: 'ipns://newdomain.com/', ipns, logger })
      expect(result.ttl).to.equal(oneHourInSeconds)
    })

    it('should return the correct TTL from the IPNS answer', async () => {
      const key = await generateKeyPair('Ed25519')
      const testPeerId = peerIdFromPrivateKey(key)

      ipns.resolve.withArgs(key.publicKey).resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        record: ipnsRecordStub({ peerId: testPeerId, ttl: oneHourInNanoseconds })
      })

      const result = await parseUrlString({ urlString: `ipns://${testPeerId}`, ipns, logger })
      expect(result.ttl).to.equal(oneHourInSeconds)
    })
  })

  describe('/ipfs/<CID> URLs', () => {
    it('should parse an IPFS Path with a CID only', async () => {
      await assertMatchUrl(
        '/ipfs/QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm/', {
          protocol: 'ipfs',
          cid: 'QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm',
          path: '',
          query: {}
        }
      )
    })

    it('can parse an IPFS Path with CID+path', async () => {
      await assertMatchUrl(
        '/ipfs/QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt', {
          protocol: 'ipfs',
          cid: 'QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm',
          path: '1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt',
          query: {}
        }
      )
    })

    it('can parse an IPFS Path with CID+queryString', async () => {
      await assertMatchUrl(
        '/ipfs/QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm?format=car', {
          protocol: 'ipfs',
          cid: 'QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm',
          path: '',
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
          path: '1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt',
          query: {
            format: 'tar'
          }
        }
      )
    })

    // tests for https://github.com/ipfs-shipyard/service-worker-gateway/issues/83 issue
    it('can parse an IPFS path with encodedURIComponents', async () => {
      const rawPathLabel = "Plan_d'exécution_du_second_étage_de_l'hôtel_de_Brionne_(dessin)_De_Cotte_2503c_–_Gallica_2011_(adjusted).jpg.webp"
      await assertMatchUrl(
        `/ipfs/QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr/I/${encodeURIComponent(rawPathLabel)}`, {
          protocol: 'ipfs',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          // path with decoded component
          path: `I/${rawPathLabel}`,
          query: {}
        }
      )
    })
  })

  describe('http://example.com/ipfs/<CID> URLs', () => {
    it('should parse an IPFS Gateway URL with a CID only', async () => {
      await assertMatchUrl(
        'http://example.com/ipfs/QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm/', {
          protocol: 'ipfs',
          cid: 'QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm',
          path: '',
          query: {}
        }
      )
    })

    it('can parse an IPFS Gateway URL with CID+path', async () => {
      await assertMatchUrl(
        'http://example.com/ipfs/QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt', {
          protocol: 'ipfs',
          cid: 'QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm',
          path: '1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt',
          query: {}
        }
      )
    })

    it('can parse an IPFS Gateway URL with CID+queryString', async () => {
      await assertMatchUrl(
        'http://example.com/ipfs/QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm?format=car', {
          protocol: 'ipfs',
          cid: 'QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm',
          path: '',
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
          path: '1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt',
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
          path: '',
          query: {}
        }
      )
    })

    it('can parse a IPFS Subdomain Gateway URL with CID+path', async () => {
      await assertMatchUrl(
        'http://QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm.ipfs.example.com/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt', {
          protocol: 'ipfs',
          cid: 'QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm',
          path: '1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt',
          query: {}
        }
      )
    })

    it('can parse a IPFS Subdomain Gateway URL with CID+queryString', async () => {
      await assertMatchUrl(
        'http://QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm.ipfs.example.com?format=car', {
          protocol: 'ipfs',
          cid: 'QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm',
          path: '',
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
          path: '1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt',
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
      ipns.resolve.rejects(new Error('Unexpected failure from ipns resolve method'))
      ipns.resolveDNSLink.rejects(new Error('Unexpected failure from ipns dns query'))

      await expect(parseUrlString({ urlString: 'ipns://123PeerIdIsFake456', ipns, logger })).to.eventually.be.rejected
        .and.deep.equal([
          new TypeError('Could not parse PeerId in ipns url "123PeerIdIsFake456", Non-base58btc character'),
          new Error('Unexpected failure from ipns dns query'),
          new Error('Invalid resource. Cannot determine CID from URL "ipns://123PeerIdIsFake456".')
        ])
    })

    it('handles valid PeerId resolve failures', async () => {
      ipns.resolve.rejects(new Error('Unexpected failure from ipns resolve method'))
      ipns.resolveDNSLink.rejects(new Error('Unexpected failure from ipns dns query'))

      await expect(parseUrlString({ urlString: `ipns://${testPeerId}`, ipns, logger })).to.eventually.be.rejected
        .and.deep.equal([
          new TypeError(`Could not resolve PeerId "${testPeerId}": Unexpected failure from ipns resolve method`),
          new Error('Unexpected failure from ipns dns query'),
          new Error(`Invalid resource. Cannot determine CID from URL "ipns://${testPeerId}".`)
        ])
    })

    it('can parse a URL with PeerId only', async () => {
      ipns.resolve.withArgs(testPeerId.publicKey).resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        record: ipnsRecordStub({ peerId: testPeerId })
      })

      await assertMatchUrl(
        `ipns://${testPeerId}`, {
          protocol: 'ipns',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          path: '',
          query: {}
        }
      )
    })

    it('can parse a base36 PeerId CID', async () => {
      ipns.resolve.withArgs(testPeerId.publicKey).resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        record: ipnsRecordStub({ peerId: testPeerId })
      })

      await assertMatchUrl(
        `ipns://${base36CidPeerId}`, {
          protocol: 'ipns',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          path: '',
          query: {}
        }
      )
    })

    it('can parse a URL with PeerId+path', async () => {
      ipns.resolve.withArgs(testPeerId.publicKey).resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        record: ipnsRecordStub({ peerId: testPeerId })
      })

      await assertMatchUrl(
        `ipns://${testPeerId}/some/path/to/file.txt`, {
          protocol: 'ipns',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          path: 'some/path/to/file.txt',
          query: {}
        }
      )
    })

    it('can parse a URL with PeerId+path with a trailing slash', async () => {
      ipns.resolve.withArgs(testPeerId.publicKey).resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        record: ipnsRecordStub({ peerId: testPeerId })
      })

      await assertMatchUrl(
        `ipns://${testPeerId}/some/path/to/dir/`, {
          protocol: 'ipns',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          path: 'some/path/to/dir/',
          query: {}
        }
      )
    })

    it('can parse a URL with PeerId+queryString', async () => {
      ipns.resolve.withArgs(testPeerId.publicKey).resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        record: ipnsRecordStub({ peerId: testPeerId })
      })

      await assertMatchUrl(
        `ipns://${testPeerId}?format=dag-cbor`, {
          protocol: 'ipns',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          path: '',
          query: {
            format: 'dag-cbor'
          }
        }
      )
    })

    it('can parse a URL with PeerId+path+queryString', async () => {
      ipns.resolve.withArgs(testPeerId.publicKey).resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        record: ipnsRecordStub({ peerId: testPeerId })
      })

      await assertMatchUrl(
        `ipns://${testPeerId}/some/path/to/file.txt?format=dag-cbor`, {
          protocol: 'ipns',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          path: 'some/path/to/file.txt',
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

      ipns.resolve.withArgs(peerId.publicKey).resolves({
        cid,
        path: recordPath,
        record: ipnsRecordStub({ peerId: testPeerId })
      })

      await assertMatchUrl(
        `ipns://${peerId}/${requestPath}`, {
          protocol: 'ipns',
          cid: 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
          path: `${recordPath}/${requestPath}`,
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

      ipns.resolve.withArgs(peerId.publicKey).resolves({
        cid,
        path: recordPath,
        record: ipnsRecordStub({ peerId: testPeerId })
      })

      await assertMatchUrl(
        `ipns://${peerId}/${requestPath}`, {
          protocol: 'ipns',
          path: 'foo/bar/baz.txt',
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

      ipns.resolve.withArgs(peerId.publicKey).resolves({
        cid,
        path: recordPath,
        record: ipnsRecordStub({ peerId: testPeerId })
      })

      await assertMatchUrl(
        `ipns://${peerId}/${requestPath}`, {
          protocol: 'ipns',
          path: 'foo/bar/baz/qux.txt',
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
      ipns.resolve.withArgs(peerId.publicKey).resolves({
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
          path: '',
          query: {}
        }
      )
    })

    it('can parse an IPNS Path with PeerId+path', async () => {
      await assertMatchUrl(
        `/ipns/${peerId}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`, {
          protocol: 'ipns',
          cid: cid.toString(),
          path: '1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt',
          query: {}
        }
      )
    })

    it('can parse an IPNS Path with PeerId+directoryPath', async () => {
      await assertMatchUrl(
        `/ipns/${peerId}/path/to/dir/`, {
          protocol: 'ipns',
          cid: cid.toString(),
          path: 'path/to/dir/',
          query: {}
        }
      )
    })

    it('can parse an IPNS Path with PeerId+queryString', async () => {
      await assertMatchUrl(
        `/ipns/${peerId}?format=car`, {
          protocol: 'ipns',
          cid: cid.toString(),
          path: '',
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
          path: '1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt',
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
          path: 'path/to/dir/',
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
        ipns.resolve.withArgs(peerId.publicKey).resolves({
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
            path: '',
            query: {}
          }
        )
      })

      it('can parse an IPNS Gateway URL with CID+path', async () => {
        await assertMatchUrl(
          `${proto}://example.com/ipns/${peerId}/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`, {
            protocol: 'ipns',
            cid: cid.toString(),
            path: '1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt',
            query: {}
          }
        )
      })

      it('can parse an IPNS Gateway URL with CID+directoryPath', async () => {
        await assertMatchUrl(
          `${proto}://example.com/ipns/${peerId}/path/to/dir/`, {
            protocol: 'ipns',
            cid: cid.toString(),
            path: 'path/to/dir/',
            query: {}
          }
        )
      })

      it('can parse an IPNS Gateway URL with CID+queryString', async () => {
        await assertMatchUrl(
          `${proto}://example.com/ipns/${peerId}?format=car`, {
            protocol: 'ipns',
            cid: cid.toString(),
            path: '',
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
            path: '1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt',
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
            path: 'path/to/dir/',
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
          ipns.resolve.withArgs((value as PeerId).publicKey).resolves({
            cid,
            path: '',
            record: ipnsRecordStub({ peerId: value as PeerId })
          })
        } else if (type === 'dnslink-encoded') {
          ipns.resolveDNSLink.withArgs(value.toString().replace(/-/g, '.')).resolves({
            cid,
            path: '',
            answer: stubInterface<Answer>()
          })
        } else {
          ipns.resolveDNSLink.withArgs(value.toString()).resolves({
            cid,
            path: '',
            answer: stubInterface<Answer>()
          })
        }
      })

      it('should parse a IPNS Subdomain Gateway URL with a CID only', async () => {
        await assertMatchUrl(
          `${proto}://${value.toString()}.ipns.example.com`, {
            protocol: 'ipns',
            cid: cid.toString(),
            path: '',
            query: {}
          }
        )
      })

      it('can parse a IPNS Subdomain Gateway URL with CID+path', async () => {
        await assertMatchUrl(
          `${proto}://${value.toString()}.ipns.example.com/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt`, {
            protocol: 'ipns',
            cid: cid.toString(),
            path: '1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt',
            query: {}
          }
        )
      })

      it('can parse a IPNS Subdomain Gateway URL with CID+directoryPath', async () => {
        await assertMatchUrl(
          `${proto}://${value.toString()}.ipns.example.com/path/to/dir/`, {
            protocol: 'ipns',
            cid: cid.toString(),
            path: 'path/to/dir/',
            query: {}
          }
        )
      })

      it('can parse a IPNS Subdomain Gateway URL with CID+queryString', async () => {
        await assertMatchUrl(
          `${proto}://${value.toString()}.ipns.example.com?format=car`, {
            protocol: 'ipns',
            cid: cid.toString(),
            path: '',
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
            path: '1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt',
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
            path: 'path/to/dir/',
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
          path: 'ipfs/bafkreicysg23kiwv34eg2d7qweipxwosdo2py4ldv42nbauguluen5v6am',
          query: {}
        }
      )
    })
  })
})
