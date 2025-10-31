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
import type { CID } from 'multiformats'
import type { StubbedInstance } from 'sinon-ts'

const FRAGMENT = '#a-fragment-should-be-ignored'

describe('dag-walk', () => {
  let helia: Helia
  let fetch: VerifiedFetch
  let dnsLink: StubbedInstance<DNSLink>
  let ipnsResolver: StubbedInstance<IPNSResolver>
  let data: Uint8Array
  let root: CID

  beforeEach(async () => {
    helia = await createHelia()
    dnsLink = stubInterface()
    ipnsResolver = stubInterface()
    fetch = await createVerifiedFetch(helia, {
      dnsLink,
      ipnsResolver
    })

    data = Uint8Array.from([0, 1, 2])
    const u = unixfs(helia)
    const file = await u.addBytes(data)
    const emptyDir = await u.addDirectory()
    const dir = await u.cp(file, emptyDir, 'world.txt')
    root = await u.cp(dir, emptyDir, 'hello')
  })

  afterEach(async () => {
    await stop(helia)
  })

  async function testUrl (url: string): Promise<void> {
    const resp = await fetch(url)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(new Uint8Array(await resp.arrayBuffer())).to.equalBytes(data)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal(url.replace(FRAGMENT, ''), 'included fragment in response url')
    expect(resp.headers.get('X-Ipfs-Path')).to.equal(`/ipfs/${root}/hello/world.txt`, 'included fragment in x-ipfs-path header')
  }

  it('should omit fragments from an HTTP URL', async () => {
    await testUrl(`http://${root}.ipfs.localhost/hello/world.txt${FRAGMENT}`)
  })

  it('should omit fragments from an HTTP URL with query parameters', async () => {
    await testUrl(`http://${root}.ipfs.localhost/hello/world.txt?foo=bar&baz=qux${FRAGMENT}`)
  })

  it('should omit fragments from an IPFS URL', async () => {
    await testUrl(`ipfs://${root}/hello/world.txt${FRAGMENT}`)
  })

  it('should omit fragments from an IPFS URL with query parameters', async () => {
    await testUrl(`ipfs://${root}/hello/world.txt?foo=bar&baz=qux${FRAGMENT}`)
  })

  it('should omit fragments from an IPFS Path', async () => {
    await testUrl(`/ipfs/${root}/hello/world.txt${FRAGMENT}`)
  })

  it('should omit fragments from an IPFS Path with query parameters', async () => {
    await testUrl(`/ipfs/${root}/hello/world.txt?foo=bar&baz=qux${FRAGMENT}`)
  })
})
