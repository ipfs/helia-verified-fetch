import { dagCbor } from '@helia/dag-cbor'
import { createIPNSRecord } from '@helia/ipns'
import { unixfs } from '@helia/unixfs'
import { ed25519Crypto } from '@ipshipyard/crypto'
import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import all from 'it-all'
import { base36 } from 'multiformats/bases/base36'
import { base58btc } from 'multiformats/bases/base58'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { createVerifiedFetch } from '../src/index.ts'
import { createHelia } from './fixtures/create-offline-helia.ts'
import type { VerifiedFetch } from '../src/index.ts'
import type { DNSLink } from '@helia/dnslink'
import type { Helia } from '@helia/interface'
import type { IPNSResolver } from '@helia/ipns'
import type { StubbedInstance } from 'sinon-ts'

describe('ipfs-uri', () => {
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
    expect(resp.headers.get('ipfs-uri')).to.equal(`ipfs://${cid}/hello/`)
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
    expect(resp.headers.get('ipfs-uri')).to.equal(`ipfs://${cid}/hello`)
  })

  it('should include trailing slash when an IPNS directory was requested with a trailing slash', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)
    const privateKey = await ed25519Crypto().generatePrivateKey()
    const value = `/ipfs/${cid}`
    const record = await createIPNSRecord(privateKey, value, 1, 10_000)
    const name = base58btc.baseEncode(privateKey.publicKey.toMultihash().bytes)

    ipnsResolver.resolve.withArgs(privateKey.publicKey.toMultihash()).returns((async function * () {
      yield {
        value,
        record
      }
    })())

    const resp = await fetch(`ipns://${name}/hello/`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal(`ipns://${name}/hello/`)
    expect(resp.headers.get('ipfs-uri')).to.equal(`ipns://${privateKey.publicKey.toCID().toString(base36)}/hello/`)
  })

  it('should omit trailing slash when an IPNS directory was requested without a trailing slash', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)
    const privateKey = await ed25519Crypto().generatePrivateKey()
    const value = `/ipfs/${cid}`
    const record = await createIPNSRecord(privateKey, value, 1, 10_000)
    const name = base58btc.baseEncode(privateKey.publicKey.toMultihash().bytes)

    ipnsResolver.resolve.withArgs(privateKey.publicKey.toMultihash()).returns((async function * () {
      yield {
        value,
        record
      }
    })())

    const resp = await fetch(`ipns://${name}/hello`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal(`ipns://${name}/hello`)
    expect(resp.headers.get('ipfs-uri')).to.equal(`ipns://${privateKey.publicKey.toCID().toString(base36)}/hello`)
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
    expect(resp.headers.get('ipfs-uri')).to.equal(`ipns://${domain}/hello/`)
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
    expect(resp.headers.get('ipfs-uri')).to.equal(`ipns://${domain}/hello`)
  })
})

describe('x-ipfs-path', () => {
  let helia: Helia
  let fetch: VerifiedFetch

  beforeEach(async () => {
    helia = await createHelia()
    fetch = await createVerifiedFetch(helia)
  })

  afterEach(async () => {
    await stop(helia)
  })

  async function addFile (name: string): Promise<string> {
    const fs = unixfs(helia)
    const [, directory] = await all(fs.addAll([{
      path: `/${name}`,
      content: uint8ArrayFromString('hello world\n')
    }], {
      wrapWithDirectory: true
    }))

    return directory.cid.toString()
  }

  it('should send x-ipfs-path alongside ipfs-uri for an ASCII content path', async () => {
    const cid = await addFile('plain.txt')

    const resp = await fetch(`ipfs://${cid}/plain.txt`)
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('ipfs-uri')).to.equal(`ipfs://${cid}/plain.txt`)
    expect(resp.headers.get('x-ipfs-path')).to.equal(`/ipfs/${cid}/plain.txt`)
  })

  it('should keep a space in the x-ipfs-path value', async () => {
    const cid = await addFile('with space.txt')

    const resp = await fetch(`ipfs://${cid}/with%20space.txt`)
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('ipfs-uri')).to.equal(`ipfs://${cid}/with%20space.txt`)
    expect(resp.headers.get('x-ipfs-path')).to.equal(`/ipfs/${cid}/with space.txt`)
  })

  // an HTTP field value can only carry HTAB, SP and visible ASCII, so these
  // content paths have no x-ipfs-path representation
  // @see https://github.com/ipfs/specs/pull/548
  const nonAscii: Array<{ name: string, segment: string }> = [
    { name: 'łódź.txt', segment: '%C5%82%C3%B3d%C5%BA.txt' },
    { name: '你好.txt', segment: '%E4%BD%A0%E5%A5%BD.txt' }
  ]

  nonAscii.forEach(({ name, segment }) => {
    it(`should omit x-ipfs-path but send ipfs-uri for "${name}"`, async () => {
      const cid = await addFile(name)

      const resp = await fetch(`ipfs://${cid}/${encodeURIComponent(name)}`)
      expect(resp.status).to.equal(200)
      expect(resp.headers.get('ipfs-uri')).to.equal(`ipfs://${cid}/${segment}`)
      expect(resp.headers.get('x-ipfs-path')).to.be.null()
    })
  })
})
