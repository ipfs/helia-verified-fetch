import { dagCbor } from '@helia/dag-cbor'
import { unixfs } from '@helia/unixfs'
import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { createHelia } from 'helia'
import { stubInterface } from 'sinon-ts'
import { createVerifiedFetch } from '../src/index.ts'
import type { VerifiedFetch } from '../src/index.ts'
import type { DNSLink } from '@helia/dnslink'
import type { IPNSResolver } from '@helia/ipns'
import type { Helia } from 'helia'
import type { StubbedInstance } from 'sinon-ts'

describe('dnslink', () => {
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

  it('should resolve an inline dnslink url', async () => {
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

    const resp = await fetch('http://dnslink--test-example-org.ipns.local')
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal('http://dnslink--test-example-org.ipns.local')
    expect(resp.headers.get('X-Ipfs-Path')).to.equal(`/ipns/${domain}`)
  })

  it('should redirect an inline dnslink url to a directory', async () => {
    const fs = unixfs(helia)
    const cid = await fs.addDirectory()

    const domain = 'dnslink-test.example.org'
    dnsLink.resolve.withArgs(domain).resolves([{
      namespace: 'ipfs',
      cid,
      path: '',
      answer: stubInterface()
    }])

    const resp = await fetch('http://local:3000/ipns/dnslink-test.example.org')
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.true()
    expect(resp.url).to.equal('http://local:3000/ipns/dnslink-test.example.org/')
    expect(resp.headers.get('X-Ipfs-Path')).to.equal(`/ipns/${domain}`)
  })
})
