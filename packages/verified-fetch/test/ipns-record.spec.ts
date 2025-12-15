import { dagCbor } from '@helia/dag-cbor'
import { generateKeyPair } from '@libp2p/crypto/keys'
import { stop } from '@libp2p/interface'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { createIPNSRecord, marshalIPNSRecord, unmarshalIPNSRecord } from 'ipns'
import { stubInterface } from 'sinon-ts'
import { MEDIA_TYPE_IPNS_RECORD } from '../src/index.ts'
import { VerifiedFetch } from '../src/verified-fetch.js'
import { createHelia } from './fixtures/create-offline-helia.js'
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

    const privateKey = await generateKeyPair('Ed25519')
    const record = await createIPNSRecord(privateKey, cid, 1, 10_000)
    const peerId = peerIdFromPrivateKey(privateKey)

    ipnsResolver.resolve.withArgs(peerId).resolves({
      cid,
      record
    })

    const marshaledRecord = marshalIPNSRecord(record)

    const resp = await verifiedFetch.fetch(`ipns://${peerId}`, {
      headers: {
        accept: MEDIA_TYPE_IPNS_RECORD
      }
    })
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('content-type')).to.equal(MEDIA_TYPE_IPNS_RECORD)
    expect(resp.headers.get('content-length')).to.equal(marshaledRecord.byteLength.toString())
    expect(resp.headers.get('x-ipfs-roots')).to.equal(cid.toV1().toString())
    expect(resp.headers.get('content-disposition')).to.equal(`attachment; filename="${peerId}.bin"`)
    expect(resp.headers.get('cache-control')).to.equal('public, max-age=300')

    const buf = new Uint8Array(await resp.arrayBuffer())
    expect(marshalIPNSRecord(record)).to.equalBytes(buf)

    const output = unmarshalIPNSRecord(buf)
    expect(output.value).to.deep.equal(`/ipfs/${cid}`)
  })

  it('should override filename when fetching a raw IPNS record', async () => {
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

    const filename = 'foo.bin'

    const resp = await verifiedFetch.fetch(`http://${peerId}.ipns.local?filename=${filename}`, {
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
