import { dagCbor } from '@helia/dag-cbor'
import { type DNSLinkResolveResult, type IPNS, type IPNSResolveResult } from '@helia/ipns'
import { stop, type ComponentLogger, type Logger } from '@libp2p/interface'
import { prefixLogger, logger as libp2pLogger } from '@libp2p/logger'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { expect } from 'aegir/chai'
import { CID } from 'multiformats/cid'
import pDefer, { type DeferredPromise } from 'p-defer'
import Sinon from 'sinon'
import { stubInterface, type StubbedInstance } from 'sinon-ts'
import { VerifiedFetch } from '../src/verified-fetch.js'
import { createHelia } from './fixtures/create-offline-helia.js'
import { getAbortablePromise } from './fixtures/get-abortable-promise.js'
import { makeAbortedRequest } from './fixtures/make-aborted-request.js'
import type { BlockRetriever, Helia } from '@helia/interface'

describe('abort-handling', function () {
  this.timeout(500) // these tests should all fail extremely quickly. if they don't, they're not aborting properly, or they're being ran on an extremely slow machine.
  const sandbox = Sinon.createSandbox()
  /**
   * CID I created by running `npx kubo add --cid-version 1 -r dist` in the `verified-fetch` package folder
   */
  const notPublishedCid = CID.parse('bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise')
  let helia: Helia
  let name: StubbedInstance<IPNS>
  let logger: ComponentLogger
  let componentLoggers: Logger[] = []
  let verifiedFetch: VerifiedFetch

  /**
   * Stubbed networking components
   */
  let blockRetriever: StubbedInstance<BlockRetriever>
  let dnsLinkResolver: Sinon.SinonStub<any[], Promise<DNSLinkResolveResult>>
  let peerIdResolver: Sinon.SinonStub<any[], Promise<IPNSResolveResult>>

  /**
   * used as promises to pass to makeAbortedRequest that will abort the request as soon as it's resolved.
   */
  let blockBrokerRetrieveCalled: DeferredPromise<void>
  let dnsLinkResolverCalled: DeferredPromise<void>
  let peerIdResolverCalled: DeferredPromise<void>

  beforeEach(async () => {
    peerIdResolver = sandbox.stub()
    dnsLinkResolver = sandbox.stub()
    peerIdResolverCalled = pDefer()
    dnsLinkResolverCalled = pDefer()
    blockBrokerRetrieveCalled = pDefer()

    dnsLinkResolver.withArgs('timeout-5000-example.com', Sinon.match.any).callsFake(async (_domain, options) => {
      dnsLinkResolverCalled.resolve()
      return getAbortablePromise(options.signal)
    })
    peerIdResolver.callsFake(async (peerId, options) => {
      peerIdResolverCalled.resolve()
      return getAbortablePromise(options.signal)
    })
    blockRetriever = stubInterface<BlockRetriever>({
      retrieve: sandbox.stub().callsFake(async (cid, options) => {
        blockBrokerRetrieveCalled.resolve()
        return getAbortablePromise(options.signal)
      })
    })

    logger = prefixLogger('test:abort-handling')
    sandbox.stub(logger, 'forComponent').callsFake((name) => {
      const newLogger = libp2pLogger(`test:abort-handling:child-logger-${componentLoggers.length}:${name}`)
      componentLoggers.push(sandbox.stub(newLogger))
      return newLogger
    })
    helia = await createHelia({
      logger,
      blockBrokers: [() => blockRetriever]
    })
    name = stubInterface<IPNS>({
      resolveDNSLink: dnsLinkResolver,
      resolve: peerIdResolver
    })
    verifiedFetch = new VerifiedFetch({
      helia,
      ipns: name
    })
  })

  afterEach(async () => {
    await stop(helia, verifiedFetch, name)
    componentLoggers = []
    sandbox.restore()
  })

  it('should abort a request before peerId resolution', async function () {
    const c = dagCbor(helia)
    const cid = await c.add({
      hello: 'world'
    })

    const peerId = await createEd25519PeerId()

    await name.publish(peerId, cid, { lifetime: 1000 * 60 * 60 })

    await expect(makeAbortedRequest(verifiedFetch, [`ipns://${peerId}`], peerIdResolverCalled.promise)).to.eventually.be.rejectedWith('aborted')
    expect(peerIdResolver.callCount).to.equal(1)
    expect(dnsLinkResolver.callCount).to.equal(0) // not called because signal abort was detected
    expect(blockRetriever.retrieve.callCount).to.equal(0) // not called because we never got the cid
  })

  it('should abort a request before dns resolution', async function () {
    await expect(makeAbortedRequest(verifiedFetch, ['ipns://timeout-5000-example.com'], dnsLinkResolverCalled.promise)).to.eventually.be.rejectedWith('aborted')

    expect(peerIdResolver.callCount).to.equal(0) // not called because peerIdFromString fails
    expect(dnsLinkResolver.callCount).to.equal(1)
    expect(blockRetriever.retrieve.callCount).to.equal(0) // not called because we never got the cid
  })

  it('should abort a request while looking for cid', async function () {
    await expect(makeAbortedRequest(verifiedFetch, [notPublishedCid, { headers: { accept: 'application/octet-stream' } }], blockBrokerRetrieveCalled.promise)).to.eventually.be.rejectedWith('aborted')

    expect(peerIdResolver.callCount).to.equal(0) // not called because parseResource never passes the resource to parseUrlString
    expect(dnsLinkResolver.callCount).to.equal(0) // not called because parseResource never passes the resource to parseUrlString
    expect(blockRetriever.retrieve.callCount).to.equal(1)
  })

  // TODO: verify that the request is aborted when calling unixfs.cat and unixfs.walkPath
})
