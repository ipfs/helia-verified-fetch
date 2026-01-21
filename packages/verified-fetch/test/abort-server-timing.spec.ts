import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { VerifiedFetch } from '../src/verified-fetch.js'
import { createHelia } from './fixtures/create-offline-helia.js'
import { getAbortablePromise } from './fixtures/get-abortable-promise.js'
import type { DNSLink, DNSLinkIPFSResult, DNSLinkIPNSResult } from '@helia/dnslink'
import type { Helia } from '@helia/interface'
import type { IPNSResolver, IPNSResolveResult } from '@helia/ipns'
import type { StubbedInstance } from 'sinon-ts'

describe('abort-server-timing', function () {
  this.timeout(5000)
  const sandbox = Sinon.createSandbox()
  let helia: Helia
  let ipnsResolver: StubbedInstance<IPNSResolver>
  let dnsLink: StubbedInstance<DNSLink>
  let verifiedFetch: VerifiedFetch
  let dnsLinkResolver: Sinon.SinonStub<any[], Promise<Array<DNSLinkIPFSResult | DNSLinkIPNSResult>>>
  let peerIdResolver: Sinon.SinonStub<any[], Promise<IPNSResolveResult>>

  beforeEach(async () => {
    peerIdResolver = sandbox.stub()
    dnsLinkResolver = sandbox.stub()

    // Stub DNS resolver to wait and then return (but we will abort)
    dnsLinkResolver.withArgs('timeout-example.com', Sinon.match.any).callsFake(async (_domain, options) => {
      await getAbortablePromise(options.signal)
      return [] // Should not be reached
    })

    helia = await createHelia()
    ipnsResolver = stubInterface<IPNSResolver>({
      resolve: peerIdResolver
    })
    dnsLink = stubInterface<DNSLink>({
      resolve: dnsLinkResolver
    })
    verifiedFetch = new VerifiedFetch(helia, {
      ipnsResolver,
      dnsLink
    })
  })

  afterEach(async () => {
    if (helia != null) {
      await stop(helia)
    }
    sandbox.restore()
  })

  it('should include server timing in thrown error when aborted', async function () {
    const controller = new AbortController()
    const signal = controller.signal

    // Abort after a short delay to allow some timing to be collected
    setTimeout(() => {
      controller.abort()
    }, 100)

    try {
      await verifiedFetch.fetch('ipns://timeout-example.com', {
        signal
      })
      throw new Error('Should have thrown')
    } catch (err: any) {
      expect(err).to.have.property('name', 'AbortError')
      expect(err).to.have.property('serverTiming')
      expect(err.serverTiming).to.be.a('string')
      expect(err.serverTiming).to.include('dnsLink.resolve')
    }
  })
})
