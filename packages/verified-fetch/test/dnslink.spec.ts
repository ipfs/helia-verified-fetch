import { withHTTP } from '@helia/http'
import { createIPNSRecord } from '@helia/ipns'
import { unixfs } from '@helia/unixfs'
import { ed25519Crypto } from '@ipshipyard/crypto'
import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { createHelia } from 'helia'
import { stubInterface } from 'sinon-ts'
import { createVerifiedFetch } from '../src/index.ts'
import type { VerifiedFetch } from '../src/index.ts'
import type { DNSLink } from '@helia/dnslink'
import type { IPNSResolver } from '@helia/ipns'
import type { Helia, PrivateKey } from 'helia'
import type { CID } from 'multiformats'
import type { StubbedInstance } from 'sinon-ts'

describe('DNSLink', () => {
  let helia: Helia
  let fetch: VerifiedFetch
  let dnsLink: StubbedInstance<DNSLink>
  let ipnsResolver: StubbedInstance<IPNSResolver>
  let privateKey: PrivateKey
  let rootCid: CID
  let level2DirCid: CID
  let level1DirCid: CID
  let fileCid: CID
  let domain: string

  beforeEach(async () => {
    helia = await withHTTP(createHelia()).start()
    dnsLink = stubInterface()
    ipnsResolver = stubInterface()
    fetch = await createVerifiedFetch(helia, {
      dnsLink,
      ipnsResolver
    })

    const fs = unixfs(helia)
    const emptyDirCid = await fs.addDirectory()
    fileCid = await fs.addBytes(Uint8Array.from([0, 1, 2, 3]))
    level2DirCid = await fs.cp(fileCid, emptyDirCid, 'baz.bin')
    level1DirCid = await fs.cp(level2DirCid, emptyDirCid, 'bar')
    rootCid = await fs.cp(level1DirCid, emptyDirCid, 'foo')

    privateKey = await ed25519Crypto().generatePrivateKey()
    domain = 'dnslink-test.example.org'
  })

  afterEach(async () => {
    await stop(helia)
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
    // the internally followed redirect does not rewrite context.url, so both
    // ipfs-uri and x-ipfs-path reflect the content path that was requested
    expect(resp.headers.get('ipfs-uri')).to.equal(`ipns://${domain}`)
    expect(resp.headers.get('x-ipfs-roots')).to.equal(`${cid}`)
  })

  it('should resolve a URL with a DNSLink record', async () => {
    dnsLink.resolve.withArgs(domain).resolves([{
      namespace: 'ipfs',
      cid: fileCid,
      path: '',
      answer: stubInterface()
    }])

    const resp = await fetch(`ipns://${domain}`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal('ipns://dnslink-test.example.org')
    expect(resp.headers.get('ipfs-uri')).to.equal(`ipns://${domain}`)
    expect(resp.headers.get('x-ipfs-roots')).to.equal(`${fileCid}`)
  })

  it('should resolve a URL to a DNSLink record with a path', async () => {
    dnsLink.resolve.withArgs(domain).resolves([{
      namespace: 'ipfs',
      cid: rootCid,
      path: '/foo/bar/baz.bin',
      answer: stubInterface()
    }])

    const resp = await fetch(`ipns://${domain}`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal('ipns://dnslink-test.example.org')
    expect(resp.headers.get('ipfs-uri')).to.equal(`ipns://${domain}`)
    expect(resp.headers.get('x-ipfs-roots')).to.equal(`${rootCid},${level1DirCid},${level2DirCid},${fileCid}`)
  })

  it('should resolve a URL to a DNSLink record that resolves to an IPNS record', async () => {
    const value = `/ipfs/${fileCid}`
    const record = await createIPNSRecord(privateKey, value, 1, 10_000)

    ipnsResolver.resolve.withArgs(privateKey.publicKey.toMultihash()).returns((async function * () {
      yield {
        record,
        value
      }
    })())

    dnsLink.resolve.withArgs(domain).resolves([{
      namespace: 'ipns',
      value: privateKey.publicKey.toMultihash(),
      path: '',
      answer: stubInterface()
    }])

    const resp = await fetch(`ipns://${domain}`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal('ipns://dnslink-test.example.org')
    expect(resp.headers.get('ipfs-uri')).to.equal(`ipns://${domain}`)
    expect(resp.headers.get('x-ipfs-roots')).to.equal(`${fileCid}`)
  })

  it('should resolve a URL to a DNSLink record with a path that resolves to an IPNS record', async () => {
    const value = `/ipfs/${rootCid}`
    const record = await createIPNSRecord(privateKey, value, 1, 10_000)

    ipnsResolver.resolve.withArgs(privateKey.publicKey.toMultihash()).returns((async function * () {
      yield {
        record,
        value
      }
    })())

    dnsLink.resolve.withArgs(domain).resolves([{
      namespace: 'ipns',
      value: privateKey.publicKey.toMultihash(),
      path: '/foo/bar/baz.bin',
      answer: stubInterface()
    }])

    const resp = await fetch(`ipns://${domain}`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal('ipns://dnslink-test.example.org')
    expect(resp.headers.get('ipfs-uri')).to.equal(`ipns://${domain}`)
    expect(resp.headers.get('x-ipfs-roots')).to.equal(`${rootCid},${level1DirCid},${level2DirCid},${fileCid}`)
  })

  it('should resolve a URL to a DNSLink record that resolves to an IPNS record with a path', async () => {
    const value = `/ipfs/${rootCid}/foo/bar/baz.bin`
    const record = await createIPNSRecord(privateKey, value, 1, 10_000)

    ipnsResolver.resolve.withArgs(privateKey.publicKey.toMultihash()).returns((async function * () {
      yield {
        record,
        value
      }
    })())

    dnsLink.resolve.withArgs(domain).resolves([{
      namespace: 'ipns',
      value: privateKey.publicKey.toMultihash(),
      path: '',
      answer: stubInterface()
    }])

    const resp = await fetch(`ipns://${domain}`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal('ipns://dnslink-test.example.org')
    expect(resp.headers.get('ipfs-uri')).to.equal(`ipns://${domain}`)
    expect(resp.headers.get('x-ipfs-roots')).to.equal(`${rootCid},${level1DirCid},${level2DirCid},${fileCid}`)
  })

  it('should resolve a URL to a DNSLink record with a path that resolves to an IPNS record with a path', async () => {
    const value = `/ipfs/${rootCid}/foo`
    const record = await createIPNSRecord(privateKey, value, 1, 10_000)

    ipnsResolver.resolve.withArgs(privateKey.publicKey.toMultihash()).returns((async function * () {
      yield {
        record,
        value
      }
    })())

    dnsLink.resolve.withArgs(domain).resolves([{
      namespace: 'ipns',
      value: privateKey.publicKey.toMultihash(),
      path: '/bar/baz.bin',
      answer: stubInterface()
    }])

    const resp = await fetch(`ipns://${domain}`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal('ipns://dnslink-test.example.org')
    expect(resp.headers.get('ipfs-uri')).to.equal(`ipns://${domain}`)
    expect(resp.headers.get('x-ipfs-roots')).to.equal(`${rootCid},${level1DirCid},${level2DirCid},${fileCid}`)
  })

  it('should resolve a URL with a path to a DNSLink record', async () => {
    dnsLink.resolve.withArgs(domain).resolves([{
      namespace: 'ipfs',
      cid: rootCid,
      path: '',
      answer: stubInterface()
    }])

    const resp = await fetch(`ipns://${domain}/foo/bar/baz.bin`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal('ipns://dnslink-test.example.org/foo/bar/baz.bin')
    expect(resp.headers.get('ipfs-uri')).to.equal(`ipns://${domain}/foo/bar/baz.bin`)
    expect(resp.headers.get('x-ipfs-roots')).to.equal(`${rootCid},${level1DirCid},${level2DirCid},${fileCid}`)
  })

  it('should resolve a URL with a path to a DNSLink record with a path', async () => {
    dnsLink.resolve.withArgs(domain).resolves([{
      namespace: 'ipfs',
      cid: rootCid,
      path: '/foo',
      answer: stubInterface()
    }])

    const resp = await fetch(`ipns://${domain}/bar/baz.bin`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal('ipns://dnslink-test.example.org/bar/baz.bin')
    expect(resp.headers.get('ipfs-uri')).to.equal(`ipns://${domain}/bar/baz.bin`)
    expect(resp.headers.get('x-ipfs-roots')).to.equal(`${rootCid},${level1DirCid},${level2DirCid},${fileCid}`)
  })

  it('should resolve a URL with a path to a DNSLink record that resolves to an IPNS record', async () => {
    const value = `/ipfs/${rootCid}`
    const record = await createIPNSRecord(privateKey, value, 1, 10_000)

    ipnsResolver.resolve.withArgs(privateKey.publicKey.toMultihash()).returns((async function * () {
      yield {
        record,
        value
      }
    })())

    dnsLink.resolve.withArgs(domain).resolves([{
      namespace: 'ipns',
      value: privateKey.publicKey.toMultihash(),
      path: '',
      answer: stubInterface()
    }])

    const resp = await fetch(`ipns://${domain}/foo/bar/baz.bin`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal('ipns://dnslink-test.example.org/foo/bar/baz.bin')
    expect(resp.headers.get('ipfs-uri')).to.equal(`ipns://${domain}/foo/bar/baz.bin`)
    expect(resp.headers.get('x-ipfs-roots')).to.equal(`${rootCid},${level1DirCid},${level2DirCid},${fileCid}`)
  })

  it('should resolve a URL with a path to a DNSLink record that resolves to an IPNS record with a path', async () => {
    const value = `/ipfs/${rootCid}/foo/bar`
    const record = await createIPNSRecord(privateKey, value, 1, 10_000)

    ipnsResolver.resolve.withArgs(privateKey.publicKey.toMultihash()).returns((async function * () {
      yield {
        record,
        value
      }
    })())

    dnsLink.resolve.withArgs(domain).resolves([{
      namespace: 'ipns',
      value: privateKey.publicKey.toMultihash(),
      path: '',
      answer: stubInterface()
    }])

    const resp = await fetch(`ipns://${domain}/baz.bin`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal('ipns://dnslink-test.example.org/baz.bin')
    expect(resp.headers.get('ipfs-uri')).to.equal(`ipns://${domain}/baz.bin`)
    expect(resp.headers.get('x-ipfs-roots')).to.equal(`${rootCid},${level1DirCid},${level2DirCid},${fileCid}`)
  })

  it('should resolve a URL with a path to a DNSLink record with a path that resolves to an IPNS record', async () => {
    const value = `/ipfs/${rootCid}`
    const record = await createIPNSRecord(privateKey, value, 1, 10_000)

    ipnsResolver.resolve.withArgs(privateKey.publicKey.toMultihash()).returns((async function * () {
      yield {
        record,
        value
      }
    })())

    dnsLink.resolve.withArgs(domain).resolves([{
      namespace: 'ipns',
      value: privateKey.publicKey.toMultihash(),
      path: '/foo/bar',
      answer: stubInterface()
    }])

    const resp = await fetch(`ipns://${domain}/baz.bin`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal('ipns://dnslink-test.example.org/baz.bin')
    expect(resp.headers.get('ipfs-uri')).to.equal(`ipns://${domain}/baz.bin`)
    expect(resp.headers.get('x-ipfs-roots')).to.equal(`${rootCid},${level1DirCid},${level2DirCid},${fileCid}`)
  })

  it('should resolve a URL with a path to a DNSLink record with a path that resolves to an IPNS record with a path', async () => {
    const value = `/ipfs/${rootCid}/foo`
    const record = await createIPNSRecord(privateKey, value, 1, 10_000)

    ipnsResolver.resolve.withArgs(privateKey.publicKey.toMultihash()).returns((async function * () {
      yield {
        record,
        value
      }
    })())

    const domain = 'dnslink-test.example.org'
    dnsLink.resolve.withArgs(domain).resolves([{
      namespace: 'ipns',
      value: privateKey.publicKey.toMultihash(),
      path: '/bar',
      answer: stubInterface()
    }])

    const resp = await fetch(`ipns://${domain}/baz.bin`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal('ipns://dnslink-test.example.org/baz.bin')
    expect(resp.headers.get('ipfs-uri')).to.equal(`ipns://${domain}/baz.bin`)
    expect(resp.headers.get('x-ipfs-roots')).to.equal(`${rootCid},${level1DirCid},${level2DirCid},${fileCid}`)
  })
})
