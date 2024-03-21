import { stop, type ComponentLogger, type Logger } from '@libp2p/interface'
import { prefixLogger, logger as libp2pLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { CID } from 'multiformats/cid'
import pDefer from 'p-defer'
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

describe('abort-handling', () => {
  let helia: Helia
  let heliaStopSpy: Sinon.SinonSpy<[], Promise<void>>
  const sandbox = Sinon.createSandbox()
  let logger: ComponentLogger
  let componentLoggers: Logger[] = []
  const notPublishedCid = CID.parse('bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise')
  let superSlowBlockRetriever: StubbedInstance<BlockRetriever>

  let blockBrokerRetrieveCalled: ReturnType<typeof pDefer>
  let dnsResolverCalled: ReturnType<typeof pDefer>

  beforeEach(async () => {
    blockBrokerRetrieveCalled = pDefer()
    dnsResolverCalled = pDefer()
    superSlowBlockRetriever = stubInterface<BlockRetriever>({
      retrieve: Sinon.stub().callsFake(async (cid, options) => {
        blockBrokerRetrieveCalled.resolve()

        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('timeout while resolving'))
          }, 10000)

          /**
           * we need to emulate signal handling (blockBrokers should handle abort signals too)
           * this is a simplified version of what the blockBroker should do, and the
           * tests in this file verify how verified-fetch would handle the failure
           */
          options.signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId)
            reject(new Error('aborted'))
          })
        })
      })
    })

    helia = await createHelia({ blockBrokers: [() => superSlowBlockRetriever] })
    logger = prefixLogger('helia:verified-fetch-test:abort-handling')

    sandbox.stub(logger, 'forComponent').callsFake((name) => {
      const newLogger = libp2pLogger(`helia:verified-fetch-test:abort-handling:child-logger-${componentLoggers.length}:${name}`)
      componentLoggers.push(sandbox.stub(newLogger))
      return newLogger
    })
    helia.logger = logger
    heliaStopSpy = sandbox.spy(helia, 'stop')
  })

  afterEach(async () => {
    await stop(helia)
    componentLoggers = []
    sandbox.restore()
  })

  it('should abort a request before dns resolution', async function () {
    this.timeout(1000)

    const customDnsResolver = Sinon.stub().resolves(new Promise((resolve, reject) => {
      dnsResolverCalled.resolve()
      setTimeout(() => { reject(new Error('timeout while resolving')) }, 5000)
    }))
    const verifiedFetch = new VerifiedFetch({
      helia
    }, {
      dnsResolvers: [customDnsResolver]
    })
    const abortedResult = await makeAbortedRequest(verifiedFetch, ['ipns://this-doesnt-matter'], Promise.resolve())

    expect(superSlowBlockRetriever.retrieve.called).to.be.false()
    expect(abortedResult).to.be.ok()
    expect(abortedResult.status).to.equal(400)
    expect(abortedResult.statusText).to.equal('Bad Request')
    // TODO: we should be able to tell that the error was aborted instead of falling through to "invalid resource"
    await expect(abortedResult.text()).to.eventually.contain('Invalid resource')
    expect(heliaStopSpy.calledOnce).to.be.true()
  })

  it('should abort a request while looking for cid', async function () {
    const verifiedFetch = new VerifiedFetch({
      helia
    })

    const abortedResult = await makeAbortedRequest(verifiedFetch, [notPublishedCid, { headers: { accept: 'application/octet-stream' } }], blockBrokerRetrieveCalled.promise)

    expect(superSlowBlockRetriever.retrieve.called).to.be.true()
    expect(abortedResult).to.be.ok()
    expect(abortedResult.status).to.equal(400)
    expect(abortedResult.statusText).to.equal('Bad Request')
    await expect(abortedResult.text()).to.eventually.contain('aborted')
    expect(heliaStopSpy.calledOnce).to.be.true()
  })
})
