import { dagCbor } from '@helia/dag-cbor'
import { dagJson } from '@helia/dag-json'
import { ipns } from '@helia/ipns'
import * as ipldDagCbor from '@ipld/dag-cbor'
import * as ipldDagJson from '@ipld/dag-json'
import { stop } from '@libp2p/interface'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { expect } from 'aegir/chai'
import * as cborg from 'cborg'
import { marshal } from 'ipns'
import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'
import { VerifiedFetch } from '../src/verified-fetch.js'
import { createHelia } from './fixtures/create-offline-helia.js'
import type { Helia } from '@helia/interface'

interface Codec {
  encode(obj: any): Uint8Array
  decode(obj: Uint8Array): any
}

interface AcceptCborTestArgs {
  obj: any
  type: string
  codec?: Codec
}

describe('accept header', () => {
  let helia: Helia
  let verifiedFetch: VerifiedFetch

  function shouldNotAcceptCborWith ({ obj, type, codec = ipldDagCbor }: AcceptCborTestArgs): void {
    it(`should return 406 Not Acceptable if CBOR ${type} field is encountered`, async () => {
      const buf = codec.encode(obj)
      const rawCid = CID.createV1(raw.code, await sha256.digest(buf))
      await helia.blockstore.put(rawCid, buf)
      const dagCborCid = CID.createV1(ipldDagCbor.code, rawCid.multihash)

      const resp = await verifiedFetch.fetch(dagCborCid, {
        headers: {
          accept: 'application/json'
        }
      })

      expect(resp.status).to.equal(406)
      expect(resp.statusText).to.equal('Not Acceptable')

      const resp2 = await verifiedFetch.fetch(dagCborCid, {
        headers: {
          accept: 'application/octet-stream'
        }
      })

      expect(resp2.status).to.equal(200)

      const out = codec.decode(new Uint8Array(await resp2.arrayBuffer()))
      expect(out).to.deep.equal(obj, 'could not round-trip as application/octet-stream')
    })
  }

  beforeEach(async () => {
    helia = await createHelia()
    verifiedFetch = new VerifiedFetch({
      helia
    })
  })

  afterEach(async () => {
    await stop(helia, verifiedFetch)
  })

  it('should allow specifying application/vnd.ipld.raw accept header to skip data decoding', async () => {
    // JSON-compliant CBOR - if decoded would otherwise cause `Content-Type` to
    // be set to `application/json`
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const resp = await verifiedFetch.fetch(cid, {
      headers: {
        accept: 'application/vnd.ipld.raw'
      }
    })
    expect(resp.headers.get('content-type')).to.equal('application/vnd.ipld.raw')

    const output = ipldDagCbor.decode(new Uint8Array(await resp.arrayBuffer()))
    expect(output).to.deep.equal(obj)
  })

  it('should allow specifying application/octet-stream accept header to skip data decoding', async () => {
    // JSON-compliant CBOR - if decoded would otherwise cause `Content-Type` to
    // be set to `application/json`
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const resp = await verifiedFetch.fetch(cid, {
      headers: {
        accept: 'application/octet-stream'
      }
    })
    expect(resp.headers.get('content-type')).to.equal('application/octet-stream')

    const output = ipldDagCbor.decode(new Uint8Array(await resp.arrayBuffer()))
    expect(output).to.deep.equal(obj)
  })

  it('should transform DAG-CBOR to DAG-JSON', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const resp = await verifiedFetch.fetch(cid, {
      headers: {
        accept: 'application/vnd.ipld.dag-json'
      }
    })
    expect(resp.headers.get('content-type')).to.equal('application/vnd.ipld.dag-json')

    const output = ipldDagJson.decode(new Uint8Array(await resp.arrayBuffer()))
    expect(output).to.deep.equal(obj)
  })

  it('should transform DAG-CBOR to JSON', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const resp = await verifiedFetch.fetch(cid, {
      headers: {
        accept: 'application/json'
      }
    })
    expect(resp.headers.get('content-type')).to.equal('application/json')

    const output = ipldDagJson.decode(new Uint8Array(await resp.arrayBuffer()))
    expect(output).to.deep.equal(obj)
  })

  it('should transform DAG-JSON to DAG-CBOR', async () => {
    const obj = {
      hello: 'world'
    }
    const j = dagJson(helia)
    const cid = await j.add(obj)

    const resp = await verifiedFetch.fetch(cid, {
      headers: {
        accept: 'application/vnd.ipld.dag-cbor'
      }
    })
    expect(resp.headers.get('content-type')).to.equal('application/vnd.ipld.dag-cbor')

    const output = ipldDagCbor.decode(new Uint8Array(await resp.arrayBuffer()))
    expect(output).to.deep.equal(obj)
  })

  it('should transform DAG-JSON to CBOR', async () => {
    const obj = {
      hello: 'world'
    }
    const j = dagJson(helia)
    const cid = await j.add(obj)

    const resp = await verifiedFetch.fetch(cid, {
      headers: {
        accept: 'application/cbor'
      }
    })
    expect(resp.headers.get('content-type')).to.equal('application/cbor')

    const output = ipldDagCbor.decode(new Uint8Array(await resp.arrayBuffer()))
    expect(output).to.deep.equal(obj)
  })

  it('should return 406 Not Acceptable if the accept header cannot be adhered to', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const resp = await verifiedFetch.fetch(cid, {
      headers: {
        accept: 'application/what-even-is-this'
      }
    })
    expect(resp.status).to.equal(406)
    expect(resp.statusText).to.equal('Not Acceptable')
  })

  it('should support wildcards', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const resp = await verifiedFetch.fetch(cid, {
      headers: {
        accept: 'application/what-even-is-this, */*, application/vnd.ipld.raw'
      }
    })
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('content-type')).to.equal('application/json')
  })

  it('should support type wildcards', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const resp = await verifiedFetch.fetch(cid, {
      headers: {
        accept: '*/json, application/vnd.ipld.raw'
      }
    })
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('content-type')).to.equal('application/json')
  })

  it('should support subtype wildcards', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const resp = await verifiedFetch.fetch(cid, {
      headers: {
        accept: 'application/*, application/vnd.ipld.raw'
      }
    })
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('content-type')).to.equal('application/json')
  })

  it('should support q-factor weighting', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const resp = await verifiedFetch.fetch(cid, {
      headers: {
        // these all match, application/json would be chosen as it is first but
        // application/octet-stream has a higher weighting so it should win
        accept: [
          'application/json;q=0.1',
          'application/application/vnd.ipld.raw;q=0.5',
          'application/octet-stream;q=0.8'
        ].join(', ')
      }
    })
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('content-type')).to.equal('application/octet-stream')
  })

  it.skip('should support fetching IPNS records', async () => {
    const peerId = await createEd25519PeerId()
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const i = ipns(helia)
    const record = await i.publish(peerId, cid)

    const resp = await verifiedFetch.fetch(`ipns://${peerId}`, {
      headers: {
        accept: 'application/vnd.ipfs.ipns-record'
      }
    })
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('content-type')).to.equal('application/vnd.ipfs.ipns-record')
    const buf = await resp.arrayBuffer()

    expect(buf).to.equalBytes(marshal(record))
  })

  shouldNotAcceptCborWith({
    obj: {
      hello: 'world',
      invalid: undefined
    },
    type: 'undefined',
    // `undefined` is not supported by the IPLD data model so we have to encode
    // using cborg and not @ipld/dag-cbor
    codec: cborg
  })

  shouldNotAcceptCborWith({
    obj: {
      hello: 'world',
      invalid: BigInt(Number.MAX_SAFE_INTEGER) + 10n
    },
    type: 'BigInt'
  })

  shouldNotAcceptCborWith({
    obj: {
      hello: 'world',
      invalid: Uint8Array.from([0, 1, 2, 3])
    },
    type: 'Uint8Array'
  })

  shouldNotAcceptCborWith({
    obj: {
      hello: 'world',
      invalid: CID.parse('QmbxpRxwKXxnJQjnPqm1kzDJSJ8YgkLxH23mcZURwPHjGv')
    },
    type: 'CID'
  })
})
