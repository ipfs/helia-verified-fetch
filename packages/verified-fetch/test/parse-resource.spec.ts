import { defaultLogger } from '@libp2p/logger'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { expect } from 'aegir/chai'
import { CID } from 'multiformats/cid'
import sinon from 'sinon'
import { stubInterface, type StubbedInstance } from 'sinon-ts'
import { parseResource } from '../src/utils/parse-resource.js'
import type { IPNS } from '@helia/ipns'

const testCID = CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr')
const peerId = await createEd25519PeerId()

describe('parseResource', () => {
  it('does not call @helia/ipns for CID', async () => {
    const shouldNotBeCalled1 = sinon.stub().throws(new Error('should not be called'))
    const shouldNotBeCalled2 = sinon.stub().throws(new Error('should not be called'))
    const { cid, path, query, ipfsPath } = await parseResource(testCID, {
      ipns: stubInterface<IPNS>({
        resolveDNSLink: shouldNotBeCalled1,
        resolve: shouldNotBeCalled2
      }),
      logger: defaultLogger()
    })
    expect(shouldNotBeCalled1.called).to.be.false()
    expect(shouldNotBeCalled2.called).to.be.false()
    expect(cid.toString()).to.equal(testCID.toString())
    expect(path).to.equal('')
    expect(query).to.deep.equal({})
    expect(ipfsPath).to.equal(`/ipfs/${testCID.toString()}`)
  })

  it('throws an error if given an invalid resource', async () => {
    // @ts-expect-error - purposefully invalid input
    await expect(parseResource({}, stubInterface<IPNS>())).to.be.rejectedWith('Invalid resource.')
  })

  describe('ipfsPath', () => {
    let ipnsStub: StubbedInstance<IPNS>

    beforeEach(async () => {
      ipnsStub = stubInterface<IPNS>({
        resolveDNSLink: sinon.stub().returns({ cid: testCID }),
        resolve: sinon.stub().returns({ cid: testCID })
      })
    });

    [
      // resource without paths
      { resource: testCID, expectedValue: `/ipfs/${testCID}` },
      { resource: `ipfs://${testCID}`, expectedValue: `/ipfs/${testCID}` },
      { resource: `http://example.com/ipfs/${testCID}`, expectedValue: `/ipfs/${testCID}` },
      { resource: `ipns://${peerId}`, expectedValue: `/ipns/${peerId}` },
      { resource: `http://example.com/ipns/${peerId}`, expectedValue: `/ipns/${peerId}` },
      { resource: 'ipns://specs.ipfs.tech', expectedValue: '/ipns/specs.ipfs.tech' },
      { resource: 'http://example.com/ipns/specs.ipfs.tech', expectedValue: '/ipns/specs.ipfs.tech' },
      // resources with paths
      { resource: `ipfs://${testCID}/foobar`, expectedValue: `/ipfs/${testCID}/foobar` },
      { resource: `http://example.com/ipfs/${testCID}/foobar`, expectedValue: `/ipfs/${testCID}/foobar` },
      { resource: `ipns://${peerId}/foobar`, expectedValue: `/ipns/${peerId}/foobar` },
      { resource: `http://example.com/ipns/${peerId}/foobar`, expectedValue: `/ipns/${peerId}/foobar` },
      { resource: 'ipns://specs.ipfs.tech/foobar', expectedValue: '/ipns/specs.ipfs.tech/foobar' },
      { resource: 'http://example.com/ipns/specs.ipfs.tech/foobar', expectedValue: '/ipns/specs.ipfs.tech/foobar' }
    ].forEach(({ resource, expectedValue }) => {
      it(`should return the correct ipfsPath for "${resource}"`, async () => {
        const { ipfsPath } = await parseResource(resource, {
          ipns: ipnsStub,
          logger: defaultLogger()
        })

        expect(ipfsPath).to.equal(expectedValue)
      })
    })
  })
})
