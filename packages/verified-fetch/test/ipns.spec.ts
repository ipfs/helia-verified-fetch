import { dagCbor } from '@helia/dag-cbor'
import { createIPNSRecord } from '@helia/ipns'
import { unixfs } from '@helia/unixfs'
import { ed25519Crypto } from '@ipshipyard/crypto'
import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { base58btc } from 'multiformats/bases/base58'
import { stubInterface } from 'sinon-ts'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { createVerifiedFetch } from '../src/index.ts'
import { createHelia } from './fixtures/create-offline-helia.ts'
import type { VerifiedFetch } from '../src/index.ts'
import type { IPNSResolver } from '@helia/ipns'
import type { Helia, PrivateKey } from 'helia'
import type { StubbedInstance } from 'sinon-ts'

describe('IPNS', () => {
  let helia: Helia
  let fetch: VerifiedFetch
  let ipnsResolver: StubbedInstance<IPNSResolver>
  let privateKey: PrivateKey

  beforeEach(async () => {
    helia = await createHelia()
    ipnsResolver = stubInterface()
    fetch = await createVerifiedFetch(helia, {
      ipnsResolver
    })
    privateKey = await ed25519Crypto().generatePrivateKey()
  })

  afterEach(async () => {
    await stop(helia)
  })

  it('should resolve an IPNS name', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const value = `/ipfs/${cid}`
    const record = await createIPNSRecord(privateKey, value, 1, 10_000)
    const name = base58btc.baseEncode(privateKey.publicKey.toMultihash().bytes)

    ipnsResolver.resolve.withArgs(privateKey.publicKey.toMultihash()).returns((async function * () {
      yield {
        record,
        value
      }
    })())

    const resp = await fetch(`ipns://${name}`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal(`ipns://${name}`)
    expect(resp.headers.get('X-Ipfs-Path')).to.equal(`/ipns/${name}`)
    expect(resp.headers.get('X-Ipfs-Roots')).to.equal(`${cid}`)
    const maxAge = Math.round(Number((record.ttl ?? 0n) / BigInt(1e9)))
    expect(resp.headers.get('cache-control')).to.match(new RegExp(`^public, max-age=${maxAge}, stale-while-revalidate=\\d+, stale-if-error=\\d+$`))
    expect(resp.headers.get('expires')).to.equal(new Date(uint8ArrayToString(record.validity ?? new Uint8Array(0))).toUTCString())
  })

  it('should resolve an IPNS name with a path', async () => {
    const path = 'foo.bin'
    const fs = unixfs(helia)
    const fileCid = await fs.addBytes(Uint8Array.from([0, 1, 2, 3]))
    const dirCid = await fs.addDirectory()
    const cid = await fs.cp(fileCid, dirCid, path)

    const value = `/ipfs/${cid}/${path}`
    const record = await createIPNSRecord(privateKey, value, 1, 10_000)
    const name = base58btc.baseEncode(privateKey.publicKey.toMultihash().bytes)

    ipnsResolver.resolve.withArgs(privateKey.publicKey.toMultihash()).returns((async function * () {
      yield {
        record,
        value
      }
    })())

    const resp = await fetch(`ipns://${name}/`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal(`ipns://${name}/`)
    expect(resp.headers.get('X-Ipfs-Path')).to.equal(`/ipns/${name}`)
    expect(resp.headers.get('X-Ipfs-Roots')).to.equal(`${cid},${fileCid}`)
  })

  it('should resolve a Libp2p PeerId encoded as a CID', async () => {
    const fs = unixfs(helia)
    const cid = await fs.addDirectory()

    const value = `/ipfs/${cid}`
    const record = await createIPNSRecord(privateKey, value, 1, 10_000)
    const name = privateKey.publicKey.toCID().toString()

    ipnsResolver.resolve.withArgs(privateKey.publicKey.toMultihash()).returns((async function * () {
      yield {
        record,
        value
      }
    })())

    const resp = await fetch(`ipfs://${name}/`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal(`ipfs://${name}/`)
    expect(resp.headers.get('X-Ipfs-Path')).to.equal(`/ipfs/${name}`)
    expect(resp.headers.get('X-Ipfs-Roots')).to.equal(`${cid}`)
  })

  it('should resolve a Libp2p PeerId encoded as a CID that includes a path', async () => {
    const path = 'foo.bin'
    const fs = unixfs(helia)
    const fileCid = await fs.addBytes(Uint8Array.from([0, 1, 2, 3]))
    const dirCid = await fs.addDirectory()
    const cid = await fs.cp(fileCid, dirCid, path)

    const value = `/ipfs/${cid}/${path}`
    const record = await createIPNSRecord(privateKey, value, 1, 10_000)
    const name = privateKey.publicKey.toCID().toString()

    ipnsResolver.resolve.withArgs(privateKey.publicKey.toMultihash()).returns((async function * () {
      yield {
        record,
        value
      }
    })())

    const resp = await fetch(`ipfs://${name}/`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal(`ipfs://${name}/`)
    expect(resp.headers.get('X-Ipfs-Path')).to.equal(`/ipfs/${name}`)
    expect(resp.headers.get('X-Ipfs-Roots')).to.equal(`${cid},${fileCid}`)
  })
})
