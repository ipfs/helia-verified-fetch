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

describe('dag-walk', () => {
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

  it('should omit fragments from the path', async () => {
    const u = unixfs(helia)
    const file = await u.addBytes(Uint8Array.from([0, 1, 2]))
    const emptyDir = await u.addDirectory()
    const dir = await u.cp(file, emptyDir, 'world.txt')
    const root = await u.cp(dir, emptyDir, 'hello')

    const resp = await fetch(`ipfs://${root}/hello/world.txt#a-fragment-should-be-ignored`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal(`ipfs://${root}/hello/world.txt`, 'included fragment in response url')
    expect(resp.headers.get('X-Ipfs-Path')).to.equal(`/ipfs/${root}/hello/world.txt`, 'included fragment in x-ipfs-path header')
  })
})
