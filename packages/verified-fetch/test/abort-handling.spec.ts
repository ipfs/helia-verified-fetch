import { dagCbor } from '@helia/dag-cbor'
import { type DNSLinkResolveResult, type IPNS, type IPNSResolveResult } from '@helia/ipns'
import { unixfs } from '@helia/unixfs'
import { stop, type ComponentLogger, type Logger } from '@libp2p/interface'
import { prefixLogger, logger as libp2pLogger } from '@libp2p/logger'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { expect } from 'aegir/chai'
import browserReadableStreamToIt from 'browser-readablestream-to-it'
import { fixedSize } from 'ipfs-unixfs-importer/chunker'
import drain from 'it-drain'
import { CID } from 'multiformats/cid'
import pDefer, { type DeferredPromise } from 'p-defer'
import Sinon from 'sinon'
import { stubInterface, type StubbedInstance } from 'sinon-ts'
import { VerifiedFetch } from '../src/verified-fetch.js'
import { createHelia } from './fixtures/create-offline-helia.js'
import { getAbortablePromise } from './fixtures/get-abortable-promise.js'
import { makeAbortedRequest } from './fixtures/make-aborted-request.js'
import type { BlockBroker, Helia } from '@helia/interface'

describe.skip('abort-handling', function () {
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
  let blockRetriever: StubbedInstance<Required<Pick<BlockBroker, 'retrieve'>>>
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
    blockRetriever = stubInterface<Required<Pick<BlockBroker, 'retrieve'>>>({
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

  it('should abort a request while loading a file root', async function () {
    const fs = unixfs(helia)

    // add a file with a very small chunk size - this is to ensure we end up
    // with a DAG that contains a root and some leaf nodes
    const fileCid = await fs.addBytes(Uint8Array.from([0, 1, 2, 3]), {
      chunker: fixedSize({ chunkSize: 2 })
    })
    const directoryCid = await fs.addDirectory()
    const cid = await fs.cp(fileCid, directoryCid, 'index.html')

    const leaf1 = CID.parse('bafkreifucp2h2e7of7tmqrns5ykbv6a55bmn6twfjgsyw6lqxolgiw6i2i')
    const leaf2 = CID.parse('bafkreihosbapmxbudbk6a4h7iohlb2u5lobrwkrme4h3p32zfv2qichdwm')

    // file root
    await expect(helia.blockstore.has(fileCid))
      .to.eventually.be.true()

    // leaf nodes
    await expect(helia.blockstore.has(leaf1))
      .to.eventually.be.true()
    await expect(helia.blockstore.has(leaf2))
      .to.eventually.be.true()

    const fileRootGot = pDefer()
    const blockstoreGetSpy = Sinon.stub(helia.blockstore, 'get')
    blockstoreGetSpy.callsFake(async (cid, options) => {
      if (cid.equals(fileCid)) {
        fileRootGot.resolve()
      }

      return blockstoreGetSpy.wrappedMethod.call(helia.blockstore, cid, options)
    })

    await expect(makeAbortedRequest(verifiedFetch, [cid], fileRootGot.promise))
      .to.eventually.be.rejectedWith('aborted')

    // not called because parseResource never passes the resource to
    // parseUrlString
    expect(peerIdResolver.callCount).to.equal(0)

    // not called because parseResource never passes the resource to
    // parseUrlString
    expect(dnsLinkResolver.callCount).to.equal(0)

    // not called because the blockstore has the content
    expect(blockRetriever.retrieve.callCount).to.equal(0)

    // the file root was loaded
    expect(blockstoreGetSpy.getCalls().map(call => call.args[0].toString()))
      .to.include(fileCid.toString())

    // the leaf nodes were not loaded because the request was aborted
    // after the root node was loaded
    expect(blockstoreGetSpy.getCalls().map(call => call.args[0].toString()))
      .to.not.include(leaf1.toString())
    expect(blockstoreGetSpy.getCalls().map(call => call.args[0].toString()))
      .to.not.include(leaf2.toString())
  })

  it('should abort a request while loading file data', async function () {
    const fs = unixfs(helia)

    // add a file with a very small chunk size - this is to ensure we end up
    // with a DAG that contains a root and some leaf nodes
    const fileCid = await fs.addBytes(Uint8Array.from([0, 1, 2, 3]), {
      chunker: fixedSize({ chunkSize: 2 })
    })
    const directoryCid = await fs.addDirectory()
    const cid = await fs.cp(fileCid, directoryCid, 'index.html')

    const leaf1 = CID.parse('bafkreifucp2h2e7of7tmqrns5ykbv6a55bmn6twfjgsyw6lqxolgiw6i2i')
    const leaf2 = CID.parse('bafkreihosbapmxbudbk6a4h7iohlb2u5lobrwkrme4h3p32zfv2qichdwm')

    // file root
    await expect(helia.blockstore.has(fileCid))
      .to.eventually.be.true()

    // leaf nodes
    await expect(helia.blockstore.has(leaf1))
      .to.eventually.be.true()
    await expect(helia.blockstore.has(leaf2))
      .to.eventually.be.true()

    const leaf1Got = pDefer()
    let leaf2Loaded = false
    const blockstoreGetSpy = Sinon.stub(helia.blockstore, 'get')
    blockstoreGetSpy.callsFake(async (cid, options) => {
      if (cid.equals(leaf1)) {
        leaf1Got.resolve()
      }

      const b = await blockstoreGetSpy.wrappedMethod.call(helia.blockstore, cid, options)

      if (cid.equals(leaf2)) {
        leaf2Loaded = true
      }

      return b
    })

    const response = await makeAbortedRequest(verifiedFetch, [cid], leaf1Got.promise)

    if (response.body == null) {
      throw new Error('Body was not set')
    }

    // error occurs during streaming response
    await expect(drain(browserReadableStreamToIt(response.body)))
      .to.eventually.be.rejectedWith('aborted')

    // not called because parseResource never passes the resource to
    // parseUrlString
    expect(peerIdResolver.callCount).to.equal(0)

    // not called because parseResource never passes the resource to
    // parseUrlString
    expect(dnsLinkResolver.callCount).to.equal(0)

    // not called because the blockstore has the content
    expect(blockRetriever.retrieve.callCount).to.equal(0)

    // the file root was loaded
    expect(blockstoreGetSpy.getCalls().map(call => call.args[0].toString()))
      .to.include(fileCid.toString())

    // the first leaf was loaded
    expect(blockstoreGetSpy.getCalls().map(call => call.args[0].toString()))
      .to.include(leaf1.toString())

    // the signal was aborted before the second leaf was loaded
    expect(leaf2Loaded).to.be.false()
  })
})
