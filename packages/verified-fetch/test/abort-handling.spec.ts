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
import type { BlockRetriever, Helia } from '@helia/interface'

async function makeAbortedRequest (verifiedFetch: VerifiedFetch, [resource, options = {}]: Parameters<typeof verifiedFetch.fetch>, promise: Promise<any>): Promise<Response> {
  const controller = new AbortController()
  const resultPromise = verifiedFetch.fetch(resource, {
    ...options,
    signal: controller.signal
  })

  void promise.then(() => {
    controller.abort()
  })
  return resultPromise
}

/**
 * we need to emulate signal handling (blockBrokers/dnsResolvers/etc should handle abort signals too)
 * this is a simplified version of what libs we depend on should do, and the
 * tests in this file verify how verified-fetch would handle the failure
 */
async function getAbortablePromise <T> (signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('timeout while resolving'))
    }, 5000)

    signal?.addEventListener('abort', () => {
      clearTimeout(timeoutId)
      reject(new Error('aborted'))
    })
  })
}

describe('abort-handling', function () {
  this.timeout(500) // these tests should all fail extremely quickly. if they don't, they're not aborting properly, or they're being ran on an extremely slow machine.
  const sandbox = Sinon.createSandbox()
  /**
   * CID I created by running `npx kubo add --cid-version 1 -r dist` in the `verified-fetch` package folder
   */
  const notPublishedCid = CID.parse('bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise')
  let helia: Helia
  // let name: IPNS
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

    const abortedResult = await makeAbortedRequest(verifiedFetch, [`ipns://${peerId}`], peerIdResolverCalled.promise)

    expect(peerIdResolver.callCount).to.equal(1)
    expect(dnsLinkResolver.callCount).to.equal(0) // not called because signal abort was detected
    expect(blockRetriever.retrieve.callCount).to.equal(0) // not called because we never got the cid
    expect(abortedResult).to.be.ok()
    expect(abortedResult.status).to.equal(400)
    expect(abortedResult.statusText).to.equal('Bad Request')
    await expect(abortedResult.text()).to.eventually.contain('aborted')
  })

  it('should abort a request before dns resolution', async function () {
    const abortedResult = await makeAbortedRequest(verifiedFetch, ['ipns://timeout-5000-example.com'], dnsLinkResolverCalled.promise)

    expect(peerIdResolver.callCount).to.equal(0) // not called because peerIdFromString fails
    expect(dnsLinkResolver.callCount).to.equal(1)
    expect(blockRetriever.retrieve.callCount).to.equal(0) // not called because we never got the cid
    expect(abortedResult).to.be.ok()
    expect(abortedResult.status).to.equal(400)
    expect(abortedResult.statusText).to.equal('Bad Request')
    await expect(abortedResult.text()).to.eventually.contain('aborted')
  })

  it('should abort a request while looking for cid', async function () {
    const abortedResult = await makeAbortedRequest(verifiedFetch, [notPublishedCid, { headers: { accept: 'application/octet-stream' } }], blockBrokerRetrieveCalled.promise)

    expect(peerIdResolver.callCount).to.equal(0) // not called because parseResource never passes the resource to parseUrlString
    expect(dnsLinkResolver.callCount).to.equal(0) // not called because parseResource never passes the resource to parseUrlString
    expect(blockRetriever.retrieve.callCount).to.equal(1)
    expect(abortedResult).to.be.ok()
    expect(abortedResult.status).to.equal(400)
    expect(abortedResult.statusText).to.equal('Bad Request')
    // this error is exactly what blockRetriever throws, so we can check for "aborted" in the error message
    await expect(abortedResult.text()).to.eventually.contain('aborted')
  })

  // TODO: verify that the request is aborted when calling unixfs.cat and unixfs.walkPath
})
