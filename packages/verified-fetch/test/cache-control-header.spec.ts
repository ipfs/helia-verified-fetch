import { dagCbor } from '@helia/dag-cbor'
import { ipns } from '@helia/ipns'
import { stop } from '@libp2p/interface'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import { VerifiedFetch } from '../src/verified-fetch.js'
import { createHelia } from './fixtures/create-offline-helia.js'
import type { Helia } from '@helia/interface'
import type { IPNS } from '@helia/ipns'

describe('cache-control header', () => {
  let helia: Helia
  let name: IPNS
  let verifiedFetch: VerifiedFetch

  beforeEach(async () => {
    helia = await createHelia()
    name = ipns(helia)
    verifiedFetch = new VerifiedFetch({
      helia
    })
  })

  afterEach(async () => {
    await stop(helia, verifiedFetch)
  })

  it('should allow return the correct max-age in the cache header for immutable responses', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const resp = await verifiedFetch.fetch(cid)

    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('Cache-Control')).to.equal('public, max-age=29030400, immutable')
  })

  it('should return not contain immutable in the cache-control header for an IPNS name', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const oneHourInMs = 1000 * 60 * 60
    const peerId = await createEd25519PeerId()

    // ipns currently only allows customising the lifetime which is also used as the TTL
    await name.publish(peerId, cid, { lifetime: oneHourInMs })

    const resp = await verifiedFetch.fetch(`ipns://${peerId}`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)

    expect(resp.headers.get('Cache-Control')).to.not.containIgnoreCase('immutable')
  })

  it.skip('should return the correct max-age in the cache-control header for an IPNS name', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const oneHourInMs = 1000 * 60 * 60
    const peerId = await createEd25519PeerId()

    // ipns currently only allows customising the lifetime which is also used as the TTL
    await name.publish(peerId, cid, { lifetime: oneHourInMs })

    const resp = await verifiedFetch.fetch(`ipns://${peerId}`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)

    expect(resp.headers.get('Cache-Control')).to.equal(`public, max-age=${oneHourInMs.toString()}`)
  })

  it('should not contain immutable in the cache-control header for a DNSLink name', async () => {
    const customDnsResolver = Sinon.stub()

    verifiedFetch = new VerifiedFetch({
      helia
    }, {
      dnsResolvers: [customDnsResolver]
    })

    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)
    customDnsResolver.returns(Promise.resolve(`/ipfs/${cid.toString()}`))

    const resp = await verifiedFetch.fetch('ipns://example-domain.com')
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)

    expect(resp.headers.get('Cache-Control')).to.not.containIgnoreCase('immutable')
  })
})
