import { dagCbor } from '@helia/dag-cbor'
import { stop } from '@libp2p/interface'
import { peerIdFromString } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { createVerifiedFetch } from '../src/index.js'
import { createHelia } from './fixtures/create-offline-helia.js'
import type { VerifiedFetch } from '../src/index.js'
import type { DNSLink } from '@helia/dnslink'
import type { Helia } from '@helia/interface'
import type { IPNSRecord, IPNSResolver } from '@helia/ipns'
import type { StubbedInstance } from 'sinon-ts'

describe('x-ipfs-path', () => {
  let helia: Helia
  let fetch: VerifiedFetch
  let dnsLink: StubbedInstance<DNSLink>
  let ipnsResolver: StubbedInstance<IPNSResolver>

  beforeEach(async () => {
    helia = await createHelia()
    dnsLink = stubInterface()
    ipnsResolver = stubInterface()
    fetch = await createVerifiedFetch(helia, {
      dnsLink,
      ipnsResolver
    })
  })

  afterEach(async () => {
    await stop(helia)
  })

  it('should include trailing slash when an IPFS directory was requested with a trailing slash', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const resp = await fetch(`ipfs://${cid}/hello/`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal(`ipfs://${cid}/hello/`)
    expect(resp.headers.get('X-Ipfs-Path')).to.equal(`/ipfs/${cid}/hello/`)
  })

  it('should omit trailing slash when an IPFS directory was requested without a trailing slash', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const resp = await fetch(`ipfs://${cid}/hello`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal(`ipfs://${cid}/hello`)
    expect(resp.headers.get('X-Ipfs-Path')).to.equal(`/ipfs/${cid}/hello`)
  })

  it('should include trailing slash when an IPNS directory was requested with a trailing slash', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)
    const peerId = peerIdFromString('12D3KooWAsKeVQRVqBi2uzfVub7L6b7oByD1dGmorN644bEx6TyT')
    const record = stubInterface<IPNSRecord>({
      ttl: 10_000_000n
    })

    ipnsResolver.resolve.withArgs(peerId).resolves({
      cid,
      record
    })

    const resp = await fetch(`ipns://${peerId}/hello/`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal(`ipns://${peerId}/hello/`)
    expect(resp.headers.get('X-Ipfs-Path')).to.equal(`/ipns/${peerId}/hello/`)
  })

  it('should omit trailing slash when an IPNS directory was requested without a trailing slash', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)
    const peerId = peerIdFromString('12D3KooWAsKeVQRVqBi2uzfVub7L6b7oByD1dGmorN644bEx6TyT')
    const record = stubInterface<IPNSRecord>({
      ttl: 10_000_000n
    })

    ipnsResolver.resolve.withArgs(peerId).resolves({
      cid,
      record
    })

    const resp = await fetch(`ipns://${peerId}/hello`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal(`ipns://${peerId}/hello`)
    expect(resp.headers.get('X-Ipfs-Path')).to.equal(`/ipns/${peerId}/hello`)
  })

  it('should include trailing slash when a DNSLink directory was requested with a trailing slash', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)
    const domain = 'example.com'
    dnsLink.resolve.withArgs(domain).resolves([{
      namespace: 'ipfs',
      cid,
      path: '',
      answer: stubInterface()
    }])

    const resp = await fetch(`ipns://${domain}/hello/`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal(`ipns://${domain}/hello/`)
    expect(resp.headers.get('X-Ipfs-Path')).to.equal(`/ipns/${domain}/hello/`)
  })

  it('should omit trailing slash when a DNSLink directory was requested without a trailing slash', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)
    const domain = 'example.com'
    dnsLink.resolve.withArgs(domain).resolves([{
      namespace: 'ipfs',
      cid,
      path: '',
      answer: stubInterface()
    }])

    const resp = await fetch(`ipns://${domain}/hello`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal(`ipns://${domain}/hello`)
    expect(resp.headers.get('X-Ipfs-Path')).to.equal(`/ipns/${domain}/hello`)
  })
})
