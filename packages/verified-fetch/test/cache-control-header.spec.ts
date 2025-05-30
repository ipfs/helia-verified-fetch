import { dagCbor } from '@helia/dag-cbor'
import { ipns } from '@helia/ipns'
import { generateKeyPair } from '@libp2p/crypto/keys'
import { stop } from '@libp2p/interface'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { dns } from '@multiformats/dns'
import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import { VerifiedFetch } from '../src/verified-fetch.js'
import { createHelia } from './fixtures/create-offline-helia.js'
import { answerFake } from './fixtures/dns-answer-fake.js'
import type { Helia } from '@helia/interface'
import type { IPNS } from '@helia/ipns'
import type { DNSResponse } from '@multiformats/dns'

describe('cache-control header', () => {
  let helia: Helia
  let name: IPNS
  let verifiedFetch: VerifiedFetch
  let customDnsResolver: Sinon.SinonStub<any[], Promise<DNSResponse>>

  beforeEach(async () => {
    customDnsResolver = Sinon.stub()
    helia = await createHelia({
      dns: dns({
        resolvers: {
          '.': customDnsResolver
        }
      })
    })
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
    const key = await generateKeyPair('Ed25519')
    const peerId = peerIdFromPrivateKey(key)

    // ipns currently only allows customizing the lifetime which is also used as the TTL
    await name.publish(key, cid, { lifetime: oneHourInMs })

    const resp = await verifiedFetch.fetch(`ipns://${peerId}`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)

    expect(resp.headers.get('Cache-Control')).to.not.containIgnoreCase('immutable')
  })

  // Skipping until https://github.com/ipfs/js-ipns/issues/310 is resolved
  // Note that the source of the error is from the `name.publish` call rather than the max-age value
  // in the cache control header.
  it.skip('should return the correct max-age in the cache-control header for an IPNS name', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const oneHourInSeconds = 60 * 60
    const key = await generateKeyPair('Ed25519')
    const peerId = peerIdFromPrivateKey(key)

    /**
     * ipns currently only allows customizing the lifetime which is also used as the TTL
     *
     * lifetime is coming back as 100000 times larger than expected
     *
     * @see https://github.com/ipfs/js-ipns/blob/16e0e10682fa9a663e0bb493a44d3e99a5200944/src/index.ts#L200
     * @see https://github.com/ipfs/js-ipns/pull/308
     */
    await name.publish(key, cid, { lifetime: oneHourInSeconds * 1000 }) // pass to ipns as milliseconds

    const resp = await verifiedFetch.fetch(`ipns://${peerId}`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)

    expect(resp.headers.get('Cache-Control')).to.equal(`public, max-age=${oneHourInSeconds}`)
  })

  it('should not contain immutable in the cache-control header for a DNSLink name', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)
    customDnsResolver.withArgs('_dnslink.example-domain.com').resolves(answerFake(`dnslink=/ipfs/${cid}`, 666, '_dnslink.example-domain.com', 16))

    const resp = await verifiedFetch.fetch('ipns://example-domain.com')
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)

    expect(resp.headers.get('Cache-Control')).to.equal('public, max-age=666')
  })
})
