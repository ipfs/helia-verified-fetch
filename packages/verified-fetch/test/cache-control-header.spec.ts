import { dagCbor } from '@helia/dag-cbor'
import { stop } from '@libp2p/interface'
import { peerIdFromString } from '@libp2p/peer-id'
import { dns } from '@multiformats/dns'
import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { VerifiedFetch } from '../src/verified-fetch.ts'
import { createHelia } from './fixtures/create-offline-helia.ts'
import { answerFake } from './fixtures/dns-answer-fake.ts'
import type { Helia } from '@helia/interface'
import { createIPNSRecord, type IPNSEntry, type IPNSResolver } from '@helia/ipns'
import type { DNSResponse } from '@multiformats/dns'
import type { StubbedInstance } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { ed25519Crypto } from '@ipshipyard/crypto'
import { base58btc } from 'multiformats/bases/base58'

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

    const privateKey = await ed25519Crypto().generatePrivateKey()
    const record = await createIPNSRecord(privateKey, `/ipfs/${cid}`, 1, 10_000)
    const name = base58btc.baseEncode(privateKey.publicKey.toMultihash().bytes)

    ipnsResolver.resolve.withArgs(privateKey.publicKey.toMultihash()).returns((async function * () {
      yield {
        record,
        value: `/ipfs/${cid}`
      }
    })())

    const resp = await verifiedFetch.fetch(`ipns://${name}`)
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
    const privateKey = await ed25519Crypto().generatePrivateKey()
    const record = await createIPNSRecord(privateKey, `/ipfs/${cid}`, 0, 60_000, {
      ttlNs: BigInt(oneHourInSeconds) * BigInt(1e9)
    })
    const name = base58btc.baseEncode(privateKey.publicKey.toMultihash().bytes)

    ipnsResolver.resolve.withArgs(privateKey.publicKey.toMultihash()).returns((async function * () {
      yield {
        record,
        value: `/ipfs/${cid}`
      }
    })())

    const resp = await verifiedFetch.fetch(`ipns://${name}`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)

    expect(resp.headers.get('Cache-Control')).to.equal(`public, max-age=${oneHourInSeconds}, stale-while-revalidate=60, stale-if-error=60`)
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
