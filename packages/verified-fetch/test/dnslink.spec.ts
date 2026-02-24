import { dagCbor } from '@helia/dag-cbor'
import { unixfs } from '@helia/unixfs'
import { generateKeyPair } from '@libp2p/crypto/keys'
import { stop } from '@libp2p/interface'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { createHelia } from 'helia'
import { createIPNSRecord } from 'ipns'
import { stubInterface } from 'sinon-ts'
import { createVerifiedFetch } from '../src/index.ts'
import type { VerifiedFetch } from '../src/index.ts'
import type { DNSLink } from '@helia/dnslink'
import type { IPNSResolver } from '@helia/ipns'
import type { Helia } from 'helia'
import type { StubbedInstance } from 'sinon-ts'

describe('DNSLink', () => {
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

  it('should resolve a DNSLink url', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)
    const domain = 'dnslink-test.example.org'
    dnsLink.resolve.withArgs(domain).resolves([{
      namespace: 'ipfs',
      cid,
      path: '',
      answer: stubInterface()
    }])

    const resp = await fetch(`ipns://${domain}`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal('ipns://dnslink-test.example.org')
    expect(resp.headers.get('X-Ipfs-Path')).to.equal(`/ipns/${domain}`)
  })

  it('should resolve a DNSLink path', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)
    const domain = 'dnslink-test.example.org'
    dnsLink.resolve.withArgs(domain).resolves([{
      namespace: 'ipfs',
      cid,
      path: '',
      answer: stubInterface()
    }])

    const resp = await fetch(`/ipns/${domain}`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal('/ipns/dnslink-test.example.org')
    expect(resp.headers.get('X-Ipfs-Path')).to.equal(`/ipns/${domain}`)
  })

  it('should redirect a DNSLink url to a directory', async () => {
    const fs = unixfs(helia)
    const cid = await fs.addDirectory()

    const domain = 'dnslink-test.example.org'
    dnsLink.resolve.withArgs(domain).resolves([{
      namespace: 'ipfs',
      cid,
      path: '',
      answer: stubInterface()
    }])

    const resp = await fetch('ipns://dnslink-test.example.org')
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.true()
    expect(resp.url).to.equal('ipns://dnslink-test.example.org/')
    expect(resp.headers.get('X-Ipfs-Path')).to.equal(`/ipns/${domain}`)
  })

  it('should resolve a url with a DNSLink record that resolves to an IPNS record', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const privateKey = await generateKeyPair('Ed25519')
    const record = await createIPNSRecord(privateKey, cid, 1, 10_000)
    const peerId = peerIdFromPrivateKey(privateKey)

    ipnsResolver.resolve.withArgs(peerId).resolves({
      cid,
      record
    })

    const domain = 'dnslink-test.example.org'
    dnsLink.resolve.withArgs(domain).resolves([{
      namespace: 'ipns',
      peerId,
      path: '',
      answer: stubInterface()
    }])

    const resp = await fetch(`ipns://${domain}`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal('ipns://dnslink-test.example.org')
    expect(resp.headers.get('X-Ipfs-Path')).to.equal(`/ipns/${domain}`)
    expect(resp.headers.get('X-Ipfs-Roots')).to.equal(`${cid}`)
  })
})
