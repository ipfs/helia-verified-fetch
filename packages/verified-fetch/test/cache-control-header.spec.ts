import { dagCbor } from '@helia/dag-cbor'
import { stop } from '@libp2p/interface'
import { peerIdFromString } from '@libp2p/peer-id'
import { dns } from '@multiformats/dns'
import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { VerifiedFetch } from '../src/verified-fetch.js'
import { createHelia } from './fixtures/create-offline-helia.js'
import { answerFake } from './fixtures/dns-answer-fake.js'
import type { Helia } from '@helia/interface'
import type { IPNSRecord, IPNSResolver } from '@helia/ipns'
import type { DNSResponse } from '@multiformats/dns'
import type { StubbedInstance } from 'sinon-ts'

describe('cache-control header', () => {
  let helia: Helia
  let ipnsResolver: StubbedInstance<IPNSResolver>
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
    ipnsResolver = stubInterface()
    verifiedFetch = new VerifiedFetch(helia, {
      ipnsResolver
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

  it('should not contain immutable in the cache-control header for an IPNS name', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)
    const peerId = peerIdFromString('12D3KooWAsKeVQRVqBi2uzfVub7L6b7oByD1dGmorN644bEx6TyT')

    const record = stubInterface<IPNSRecord>({
      ttl: 1_000_000_000n
    })

    ipnsResolver.resolve.withArgs(peerId).resolves({
      cid,
      record
    })

    const resp = await verifiedFetch.fetch(`ipns://${peerId}`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)

    expect(resp.headers.get('Cache-Control')).to.not.containIgnoreCase('immutable')
  })

  it('should return the correct max-age in the cache-control header for an IPNS name', async () => {
    const oneHourInSeconds = 60 * 60
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)
    const peerId = peerIdFromString('12D3KooWAsKeVQRVqBi2uzfVub7L6b7oByD1dGmorN644bEx6TyT')

    const record = stubInterface<IPNSRecord>({
      ttl: BigInt(oneHourInSeconds) * BigInt(1e9)
    })

    ipnsResolver.resolve.withArgs(peerId).resolves({
      cid,
      record
    })

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
