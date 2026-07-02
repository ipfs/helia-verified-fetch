import { dagCbor } from '@helia/dag-cbor'
import { createIPNSRecord, IPNSEntry } from '@helia/ipns'
import { ed25519Crypto } from '@ipshipyard/crypto'
import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { base58btc } from 'multiformats/bases/base58'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { MEDIA_TYPE_IPNS_RECORD } from '../src/index.ts'
import { VerifiedFetch } from '../src/verified-fetch.ts'
import { createHelia } from './fixtures/create-offline-helia.ts'
import type { Helia } from '@helia/interface'
import type { IPNSResolver } from '@helia/ipns'
import type { StubbedInstance } from 'sinon-ts'

describe('ipns records', () => {
  let helia: Helia
  let ipnsResolver: StubbedInstance<IPNSResolver>
  let verifiedFetch: VerifiedFetch

  beforeEach(async () => {
    helia = await createHelia()
    ipnsResolver = stubInterface()
    verifiedFetch = new VerifiedFetch(helia, {
      ipnsResolver
    })
  })

  afterEach(async () => {
    await stop(helia, verifiedFetch)
  })

  it('should support fetching a raw IPNS record', async () => {
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

    const marshaledRecord = IPNSEntry.encode(record)

    const resp = await verifiedFetch.fetch(`ipns://${name}`, {
      headers: {
        accept: MEDIA_TYPE_IPNS_RECORD
      }
    })
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('content-type')).to.equal(MEDIA_TYPE_IPNS_RECORD)
    expect(resp.headers.get('content-length')).to.equal(marshaledRecord.byteLength.toString())
    expect(resp.headers.get('x-ipfs-roots')).to.equal(cid.toV1().toString())
    expect(resp.headers.get('content-disposition')).to.equal(`attachment; filename="${name}.bin"`)
    const maxAge = Math.round(Number((record.ttl ?? 0n) / BigInt(1e9)))
    expect(resp.headers.get('cache-control')).to.match(new RegExp(`^public, max-age=${maxAge}, stale-while-revalidate=\\d+, stale-if-error=\\d+$`))
    expect(resp.headers.get('expires')).to.equal(new Date(uint8ArrayToString(record.validity ?? new Uint8Array(0))).toUTCString())

    const buf = new Uint8Array(await resp.arrayBuffer())
    expect(IPNSEntry.encode(record)).to.equalBytes(buf)

    const output = IPNSEntry.decode(buf)
    expect(output.value).to.equalBytes(uint8ArrayFromString(`/ipfs/${cid}`))
  })

  it('should override filename when fetching a raw IPNS record', async () => {
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

    const filename = 'foo.bin'

    const resp = await verifiedFetch.fetch(`ipns://${name}?filename=${filename}`, {
      headers: {
        accept: MEDIA_TYPE_IPNS_RECORD
      }
    })
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('content-disposition')).to.equal(`attachment; filename="${filename}"`)
  })

  it('should reject a request for non-IPNS url', async () => {
    const resp = await verifiedFetch.fetch('ipfs://QmbxpRxwKXxnJQjnPqm1kzDJSJ8YgkLxH23mcZURwPHjGv', {
      headers: {
        accept: MEDIA_TYPE_IPNS_RECORD
      }
    })
    expect(resp.status).to.equal(406)
  })

  it('should reject a request for a DNSLink url', async () => {
    const resp = await verifiedFetch.fetch('ipns://ipfs.io', {
      headers: {
        accept: MEDIA_TYPE_IPNS_RECORD
      }
    })
    expect(resp.status).to.equal(406)
  })

  it('should reject a request for an IPNS url with a path component', async () => {
    const resp = await verifiedFetch.fetch('ipns://QmbxpRxwKXxnJQjnPqm1kzDJSJ8YgkLxH23mcZURwPHjGv/hello', {
      headers: {
        accept: MEDIA_TYPE_IPNS_RECORD
      }
    })
    expect(resp.status).to.equal(400)
  })
})
