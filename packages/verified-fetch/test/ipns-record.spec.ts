import { dagCbor } from '@helia/dag-cbor'
import { generateKeyPair } from '@libp2p/crypto/keys'
import { stop } from '@libp2p/interface'
import { Record as DHTRecord } from '@libp2p/kad-dht'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { Key } from 'interface-datastore'
import { createIPNSRecord, marshalIPNSRecord, unmarshalIPNSRecord } from 'ipns'
import { stubInterface } from 'sinon-ts'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
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

    // store the record in the datastore
    const routingKey = uint8ArrayConcat([
      uint8ArrayFromString('/ipns/'),
      peerId.toMultihash().bytes
    ])
    const datastoreKey = new Key('/dht/record/' + uint8ArrayToString(routingKey, 'base32'), false)
    const dhtRecord = new DHTRecord(routingKey, marshalIPNSRecord(record), new Date())
    await helia.datastore.put(datastoreKey, dhtRecord.serialize())

    const resp = await verifiedFetch.fetch(`ipns://${peerId}`, {
      headers: {
        accept: 'application/vnd.ipfs.ipns-record'
      }
    })
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('content-type')).to.equal('application/vnd.ipfs.ipns-record')

    const buf = new Uint8Array(await resp.arrayBuffer())
    expect(marshalIPNSRecord(record)).to.equalBytes(buf)

    const output = unmarshalIPNSRecord(buf)
    expect(output.value).to.deep.equal(`/ipfs/${cid}`)
  })

  it('should reject a request for non-IPNS url', async () => {
    const resp = await verifiedFetch.fetch('ipfs://QmbxpRxwKXxnJQjnPqm1kzDJSJ8YgkLxH23mcZURwPHjGv', {
      headers: {
        accept: 'application/vnd.ipfs.ipns-record'
      }
    })
    expect(resp.status).to.equal(400)
  })

  it('should reject a request for a DNSLink url', async () => {
    const resp = await verifiedFetch.fetch('ipns://ipfs.io', {
      headers: {
        accept: 'application/vnd.ipfs.ipns-record'
      }
    })
    expect(resp.status).to.equal(400)
  })

  it('should reject a request for an IPNS url with a path component', async () => {
    const resp = await verifiedFetch.fetch('ipns://QmbxpRxwKXxnJQjnPqm1kzDJSJ8YgkLxH23mcZURwPHjGv/hello', {
      headers: {
        accept: 'application/vnd.ipfs.ipns-record'
      }
    })
    expect(resp.status).to.equal(400)
  })
})
