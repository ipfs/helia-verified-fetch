import { matchPeerId } from '@libp2p/interface-compliance-tests/matchers'
import { defaultLogger } from '@libp2p/logger'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { expect } from 'aegir/chai'
import { CID } from 'multiformats/cid'
import { stubInterface } from 'sinon-ts'
import { parseUrlString } from '../../src/utils/parse-url-string.js'
import type { IPNS } from '@helia/ipns'
import type { ComponentLogger, PeerId } from '@libp2p/interface'
import type { StubbedInstance } from 'sinon-ts'

describe('parseUrlString', () => {
  let logger: ComponentLogger
  let ipns: StubbedInstance<IPNS>

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
        .with.property('message', 'Invalid URL: invalid, please use ipfs:// or ipns:// URLs only.')
    })

    it('throws for invalid protocols', async () => {
      await expect(
        parseUrlString({
          urlString: 'invalid',
          ipns,
          logger
        })
      ).to.eventually.be.rejected
        .with.property('message', 'Invalid URL: invalid, please use ipfs:// or ipns:// URLs only.')
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
      ).to.eventually.be.rejected
        .with.property('message', 'Could not parse PeerId in ipns url "mydomain.com", Non-base64 character')
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
      const result = await parseUrlString({
        urlString: 'ipfs://QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr',
        ipns,
        logger
      })
      expect(result.protocol).to.equal('ipfs')
      expect(result.cid.toString()).to.equal('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr')
      expect(result.path).to.equal('')
    })

    it('can parse URL with CID+path', async () => {
      const result = await parseUrlString({
        urlString: 'ipfs://QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt',
        ipns,
        logger
      })
      expect(result.protocol).to.equal('ipfs')
      expect(result.cid.toString()).to.equal('QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm')
      expect(result.path).to.equal('1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt')
    })

    it('can parse URL with CID+queryString', async () => {
      const result = await parseUrlString({
        urlString: 'ipfs://QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm?format=car',
        ipns,
        logger
      })
      expect(result.protocol).to.equal('ipfs')
      expect(result.cid.toString()).to.equal('QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm')
      expect(result.path).to.equal('')
      expect(result.query).to.deep.equal({ format: 'car' })
    })

    it('can parse URL with CID+path+queryString', async () => {
      const result = await parseUrlString({
        urlString: 'ipfs://QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt?format=tar',
        ipns,
        logger
      })
      expect(result.protocol).to.equal('ipfs')
      expect(result.cid.toString()).to.equal('QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm')
      expect(result.path).to.equal('1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt')
      expect(result.query).to.deep.equal({ format: 'tar' })
    })
  })

  describe('ipns://<dnsLinkDomain> URLs', () => {
    it('handles invalid DNSLinkDomains', async () => {
      ipns.resolve.rejects(new Error('Unexpected failure from ipns resolve method'))
      ipns.resolveDns.rejects(new Error('Unexpected failure from ipns dns query'))

      await expect(parseUrlString({ urlString: 'ipns://mydomain.com', ipns, logger })).to.eventually.be.rejected
        .with.property('errors').that.deep.equals([
          new TypeError('Could not parse PeerId in ipns url "mydomain.com", Non-base64 character'),
          new Error('Unexpected failure from ipns dns query')
        ])
    })

    it('can parse a URL with DNSLinkDomain only', async () => {
      ipns.resolveDns.withArgs('mydomain.com').resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: ''
      })

      const result = await parseUrlString({
        urlString: 'ipns://mydomain.com',
        ipns,
        logger
      })
      expect(result.protocol).to.equal('ipns')
      expect(result.cid.toString()).to.equal('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr')
      expect(result.path).to.equal('')
    })

    it('can parse a URL with DNSLinkDomain+path', async () => {
      ipns.resolveDns.withArgs('mydomain.com').resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: ''
      })

      const result = await parseUrlString({
        urlString: 'ipns://mydomain.com/some/path/to/file.txt',
        ipns,
        logger
      })
      expect(result.protocol).to.equal('ipns')
      expect(result.cid.toString()).to.equal('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr')
      expect(result.path).to.equal('some/path/to/file.txt')
    })

    it('can parse a URL with DNSLinkDomain+queryString', async () => {
      ipns.resolveDns.withArgs('mydomain.com').resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: ''
      })

      const result = await parseUrlString({
        urlString: 'ipns://mydomain.com?format=json',
        ipns,
        logger
      })
      expect(result.protocol).to.equal('ipns')
      expect(result.cid.toString()).to.equal('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr')
      expect(result.path).to.equal('')
      expect(result.query).to.deep.equal({ format: 'json' })
    })

    it('can parse a URL with DNSLinkDomain+path+queryString', async () => {
      ipns.resolveDns.withArgs('mydomain.com').resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: ''
      })

      const result = await parseUrlString({
        urlString: 'ipns://mydomain.com/some/path/to/file.txt?format=json',
        ipns,
        logger: defaultLogger()
      })
      expect(result.protocol).to.equal('ipns')
      expect(result.cid.toString()).to.equal('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr')
      expect(result.path).to.equal('some/path/to/file.txt')
      expect(result.query).to.deep.equal({ format: 'json' })
    })
  })

  describe('ipns://<peerId> URLs', () => {
    let testPeerId: PeerId

    beforeEach(async () => {
      testPeerId = await createEd25519PeerId()
    })

    it('handles invalid PeerIds', async () => {
      ipns.resolve.rejects(new Error('Unexpected failure from ipns resolve method'))
      ipns.resolveDns.rejects(new Error('Unexpected failure from ipns dns query'))

      await expect(parseUrlString({ urlString: 'ipns://123PeerIdIsFake456', ipns, logger })).to.eventually.be.rejected
        .with.property('errors').that.deep.equals([
          new TypeError('Could not parse PeerId in ipns url "123PeerIdIsFake456", Non-base58btc character'),
          new Error('Unexpected failure from ipns dns query')
        ])
    })

    it('handles valid PeerId resolve failures', async () => {
      ipns.resolve.rejects(new Error('Unexpected failure from ipns resolve method'))
      ipns.resolveDns.rejects(new Error('Unexpected failure from ipns dns query'))

      await expect(parseUrlString({ urlString: `ipns://${testPeerId}`, ipns, logger })).to.eventually.be.rejected
        .with.property('errors').that.deep.equals([
          new TypeError(`Could not resolve PeerId "${testPeerId}", Unexpected failure from ipns resolve method`),
          new Error('Unexpected failure from ipns dns query')
        ])
    })

    it('can parse a URL with PeerId only', async () => {
      ipns.resolve.withArgs(matchPeerId(testPeerId)).resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: ''
      })
      const result = await parseUrlString({
        urlString: `ipns://${testPeerId}`,
        ipns,
        logger
      })
      expect(result.protocol).to.equal('ipns')
      expect(result.cid.toString()).to.equal('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr')
      expect(result.path).to.equal('')
    })

    it('can parse a URL with PeerId+path', async () => {
      ipns.resolve.withArgs(matchPeerId(testPeerId)).resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: ''
      })
      const result = await parseUrlString({
        urlString: `ipns://${testPeerId}/some/path/to/file.txt`,
        ipns,
        logger
      })
      expect(result.protocol).to.equal('ipns')
      expect(result.cid.toString()).to.equal('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr')
      expect(result.path).to.equal('some/path/to/file.txt')
    })

    it('can parse a URL with PeerId+queryString', async () => {
      ipns.resolve.withArgs(matchPeerId(testPeerId)).resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: ''
      })
      const result = await parseUrlString({
        urlString: `ipns://${testPeerId}?fomat=dag-cbor`,
        ipns,
        logger
      })
      expect(result.protocol).to.equal('ipns')
      expect(result.cid.toString()).to.equal('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr')
      expect(result.path).to.equal('')
      expect(result.query).to.deep.equal({ fomat: 'dag-cbor' })
    })

    it('can parse a URL with PeerId+path+queryString', async () => {
      ipns.resolve.withArgs(matchPeerId(testPeerId)).resolves({
        cid: CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'),
        path: ''
      })
      const result = await parseUrlString({
        urlString: `ipns://${testPeerId}/some/path/to/file.txt?fomat=dag-cbor`,
        ipns,
        logger
      })
      expect(result.protocol).to.equal('ipns')
      expect(result.cid.toString()).to.equal('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr')
      expect(result.path).to.equal('some/path/to/file.txt')
      expect(result.query).to.deep.equal({ fomat: 'dag-cbor' })
    })

    it('should parse an ipns:// url with a path that resolves to a path', async () => {
      const cid = CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr')
      const peerId = await createEd25519PeerId()
      const recordPath = 'foo'
      const requestPath = 'bar/baz.txt'

      ipns.resolve.withArgs(matchPeerId(peerId)).resolves({
        cid,
        path: recordPath
      })

      await expect(parseUrlString({
        urlString: `ipns://${peerId}/${requestPath}`,
        ipns,
        logger
      })).to.eventually.deep.equal({
        protocol: 'ipns',
        path: `${recordPath}/${requestPath}`,
        cid,
        query: {}
      })
    })
  })
})
