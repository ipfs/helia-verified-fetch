import { matchPeerId } from '@libp2p/interface-compliance-tests/matchers'
import { defaultLogger } from '@libp2p/logger'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { expect } from 'aegir/chai'
import { CID } from 'multiformats/cid'
import { stubInterface } from 'sinon-ts'
import { parseUrlString } from '../../src/utils/parse-url-string.js'
import type { IPNS } from '@helia/ipns'
import type { ComponentLogger } from '@libp2p/interface'
import type { StubbedInstance } from 'sinon-ts'

describe('parse-url-string', () => {
  let logger: ComponentLogger
  let ipns: StubbedInstance<IPNS>

  beforeEach(() => {
    logger = defaultLogger()
    ipns = stubInterface<IPNS>()
  })

  it('should parse an ipfs:// url', async () => {
    const cid = CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr')

    await expect(parseUrlString({
      urlString: `ipfs://${cid}`,
      ipns,
      logger
    })).to.eventually.deep.equal({
      protocol: 'ipfs',
      path: '',
      cid,
      query: {}
    })
  })

  it('should parse an ipfs:// url with a path', async () => {
    const cid = CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr')
    const path = 'foo/bar/baz.txt'

    await expect(parseUrlString({
      urlString: `ipfs://${cid}/${path}`,
      ipns,
      logger
    })).to.eventually.deep.equal({
      protocol: 'ipfs',
      path,
      cid,
      query: {}
    })
  })

  it('should parse an ipfs:// url with a path and a query', async () => {
    const cid = CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr')
    const path = 'foo/bar/baz.txt'

    await expect(parseUrlString({
      urlString: `ipfs://${cid}/${path}?format=car&download=true&filename=qux.zip`,
      ipns,
      logger
    })).to.eventually.deep.equal({
      protocol: 'ipfs',
      path,
      cid,
      query: {
        format: 'car',
        download: true,
        filename: 'qux.zip'
      }
    })
  })

  it('should parse an ipns:// url', async () => {
    const cid = CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr')
    const peerId = await createEd25519PeerId()

    ipns.resolve.withArgs(matchPeerId(peerId)).resolves({
      cid,
      path: ''
    })

    await expect(parseUrlString({
      urlString: `ipns://${peerId}`,
      ipns,
      logger
    })).to.eventually.deep.equal({
      protocol: 'ipns',
      path: '',
      cid,
      query: {}
    })
  })

  it('should parse an ipns:// url with a path', async () => {
    const cid = CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr')
    const peerId = await createEd25519PeerId()
    const path = 'foo/bar/baz.txt'

    ipns.resolve.withArgs(matchPeerId(peerId)).resolves({
      cid,
      path: ''
    })

    await expect(parseUrlString({
      urlString: `ipns://${peerId}/${path}`,
      ipns,
      logger
    })).to.eventually.deep.equal({
      protocol: 'ipns',
      path,
      cid,
      query: {}
    })
  })

  it('should parse an ipns:// url that resolves to a path', async () => {
    const cid = CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr')
    const peerId = await createEd25519PeerId()
    const path = 'foo/bar/baz.txt'

    ipns.resolve.withArgs(matchPeerId(peerId)).resolves({
      cid,
      path
    })

    await expect(parseUrlString({
      urlString: `ipns://${peerId}`,
      ipns,
      logger
    })).to.eventually.deep.equal({
      protocol: 'ipns',
      path,
      cid,
      query: {}
    })
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

  it('should parse an ipns:// url with a path and a query', async () => {
    const cid = CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr')
    const peerId = await createEd25519PeerId()
    const path = 'foo/bar/baz.txt'

    ipns.resolve.withArgs(matchPeerId(peerId)).resolves({
      cid,
      path
    })

    await expect(parseUrlString({
      urlString: `ipns://${peerId}?format=car&download=true&filename=qux.zip`,
      ipns,
      logger
    })).to.eventually.deep.equal({
      protocol: 'ipns',
      path,
      cid,
      query: {
        format: 'car',
        download: true,
        filename: 'qux.zip'
      }
    })
  })
})
