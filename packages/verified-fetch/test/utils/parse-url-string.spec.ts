import { matchPeerId } from '@libp2p/interface-compliance-tests/matchers'
import { defaultLogger } from '@libp2p/logger'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { type Answer } from '@multiformats/dns'
import { expect } from 'aegir/chai'
import { type IPNSRecord } from 'ipns'
import { CID } from 'multiformats/cid'
import { match } from 'sinon'
import { stubInterface } from 'sinon-ts'
import { parseUrlString } from '../../src/utils/parse-url-string.js'
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
      ).to.eventually.be.rejected.and.to.have.nested.property('errors[0]').to.deep.equal(
        new TypeError('Could not parse PeerId in ipns url "mydomain.com", Non-base64 character')
      )
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
        .with.property('errors').that.deep.equals([
          new TypeError('Could not parse PeerId in ipns url "mydomain.com", Non-base64 character'),
          new Error('Unexpected failure from ipns dns query')
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

    beforeEach(async () => {
      testPeerId = await createEd25519PeerId()
    })

    it('handles invalid PeerIds', async () => {
      ipns.resolve.rejects(new Error('Unexpected failure from ipns resolve method'))
      ipns.resolveDNSLink.rejects(new Error('Unexpected failure from ipns dns query'))

      await expect(parseUrlString({ urlString: 'ipns://123PeerIdIsFake456', ipns, logger })).to.eventually.be.rejected
        .with.property('errors').that.deep.equals([
          new TypeError('Could not parse PeerId in ipns url "123PeerIdIsFake456", Non-base58btc character'),
          new Error('Unexpected failure from ipns dns query')
        ])
    })

    it('handles valid PeerId resolve failures', async () => {
      ipns.resolve.rejects(new Error('Unexpected failure from ipns resolve method'))
      ipns.resolveDNSLink.rejects(new Error('Unexpected failure from ipns dns query'))

      await expect(parseUrlString({ urlString: `ipns://${testPeerId}`, ipns, logger })).to.eventually.be.rejected
        .with.property('errors').that.deep.equals([
          new TypeError(`Could not resolve PeerId "${testPeerId}", Unexpected failure from ipns resolve method`),
          new Error('Unexpected failure from ipns dns query')
        ])
    })

    it('can parse a URL with PeerId only', async () => {
      ipns.resolve.withArgs(matchPeerId(testPeerId)).resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        record: stubInterface<IPNSRecord>()
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

    it('can parse a URL with PeerId+path', async () => {
      ipns.resolve.withArgs(matchPeerId(testPeerId)).resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        record: stubInterface<IPNSRecord>()
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
      ipns.resolve.withArgs(matchPeerId(testPeerId)).resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        record: stubInterface<IPNSRecord>()
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
      ipns.resolve.withArgs(matchPeerId(testPeerId)).resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        record: stubInterface<IPNSRecord>()
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
      ipns.resolve.withArgs(matchPeerId(testPeerId)).resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: '',
        record: stubInterface<IPNSRecord>()
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
      const peerId = await createEd25519PeerId()
      const recordPath = 'foo'
      const requestPath = 'bar/baz.txt'

      ipns.resolve.withArgs(matchPeerId(peerId)).resolves({
        cid,
        path: recordPath,
        record: stubInterface<IPNSRecord>()
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
      const peerId = await createEd25519PeerId()
      const recordPath = 'foo/'
      const requestPath = 'bar/baz.txt'

      ipns.resolve.withArgs(matchPeerId(peerId)).resolves({
        cid,
        path: recordPath,
        record: stubInterface<IPNSRecord>()
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
      const peerId = await createEd25519PeerId()
      const recordPath = '/foo/////bar//'
      const requestPath = '///baz///qux.txt'

      ipns.resolve.withArgs(matchPeerId(peerId)).resolves({
        cid,
        path: recordPath,
        record: stubInterface<IPNSRecord>()
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
      peerId = await createEd25519PeerId()
      cid = CID.parse('QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm')
      ipns.resolve.withArgs(matchPeerId(peerId)).resolves({
        cid,
        path: '',
        record: stubInterface<IPNSRecord>()
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
        peerId = await createEd25519PeerId()
        cid = CID.parse('QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm')
        ipns.resolve.withArgs(matchPeerId(peerId)).resolves({
          cid,
          path: '',
          record: stubInterface<IPNSRecord>()
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
    ['peerid', async () => createEd25519PeerId()]
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
          ipns.resolve.withArgs(matchPeerId(value as PeerId)).resolves({
            cid,
            path: '',
            record: stubInterface<IPNSRecord>()
          })
        } else if (type === 'dnslink-encoded') {
          const matchValue = (value as string).replace(/-/g, '.')
          ipns.resolveDNSLink.withArgs(match(matchValue)).resolves({
            cid,
            path: '',
            answer: stubInterface<Answer>()
          })
        } else {
          ipns.resolveDNSLink.withArgs(match(value as string)).resolves({
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
})
