import * as dagCbor from '@ipld/dag-cbor'
import * as dagJson from '@ipld/dag-json'
import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { CID } from 'multiformats'
import { sha256 } from 'multiformats/hashes/sha2'
import { MEDIA_TYPE_DAG_CBOR } from '../src/index.ts'
import { CONTENT_TYPE_CBOR, CONTENT_TYPE_DAG_CBOR, CONTENT_TYPE_DAG_JSON, CONTENT_TYPE_JSON, CONTENT_TYPE_RAW } from '../src/utils/content-types.ts'
import { VerifiedFetch } from '../src/verified-fetch.ts'
import { createHelia } from './fixtures/create-offline-helia.js'
import type { ContentType } from '../src/index.ts'
import type { Helia } from 'helia'

interface Fixture {
  contentType: ContentType
  verify (obj: any, cid: CID, res: Response): Promise<void>
}

const fixtures: Fixture[] = [{
  contentType: CONTENT_TYPE_DAG_JSON,
  async verify (obj, cid, res) {
    const body = await res.arrayBuffer()
    const decoded = dagJson.decode(new Uint8Array(body))
    expect(decoded).to.deep.equal(obj)
  }
}, {
  contentType: CONTENT_TYPE_JSON,
  async verify (obj, cid, res) {
    const body = await res.arrayBuffer()
    expect(new Uint8Array(body)).to.equalBytes(dagJson.encode(obj))
  }
}, {
  contentType: CONTENT_TYPE_CBOR,
  async verify (obj, cid, res) {
    const body = await res.arrayBuffer()
    expect(new Uint8Array(body)).to.equalBytes(dagCbor.encode(obj))
  }
}, {
  contentType: CONTENT_TYPE_DAG_CBOR,
  async verify (obj, cid, res) {
    const body = await res.arrayBuffer()
    expect(new Uint8Array(body)).to.equalBytes(dagCbor.encode(obj))
  }
}, {
  contentType: CONTENT_TYPE_RAW,
  async verify (obj, cid, res) {
    const body = await res.arrayBuffer()
    expect(new Uint8Array(body)).to.equalBytes(dagJson.encode(obj))
  }
}]

describe('dag-json', () => {
  let helia: Helia
  let verifiedFetch: VerifiedFetch

  beforeEach(async () => {
    helia = await createHelia()
    verifiedFetch = new VerifiedFetch(helia)
  })

  afterEach(async () => {
    await stop(helia, verifiedFetch)
  })

  it('should download DAG-JSON blocks as application/vnd.ipld.dag-json by default', async () => {
    const obj = {
      hello: 'world',
      link: CID.parse('bafkqaddimvwgy3zao5xxe3debi')
    }
    const buf = dagCbor.encode(obj)
    const digest = await sha256.digest(buf)
    const cid = CID.createV1(dagCbor.code, digest)

    await helia.blockstore.put(cid, buf)

    const res = await verifiedFetch.fetch(`/ipfs/${cid}`)
    expect(res.ok).to.be.true()
    expect(res.headers.get('content-type')).to.equal(MEDIA_TYPE_DAG_CBOR)

    const body = await res.arrayBuffer()
    const decoded = dagCbor.decode(new Uint8Array(body))

    expect(decoded).to.deep.equal(obj)
  })

  for (const fixture of fixtures) {
    // eslint-disable-next-line no-loop-func
    it(`should download DAG-JSON blocks as ${fixture.contentType.mediaType}`, async () => {
      const obj = {
        hello: 'world',
        link: CID.parse('bafkqaddimvwgy3zao5xxe3debi')
      }
      const buf = dagJson.encode(obj)
      const digest = await sha256.digest(buf)
      const cid = CID.createV1(dagJson.code, digest)

      await helia.blockstore.put(cid, buf)

      const res = await verifiedFetch.fetch(`/ipfs/${cid}`, {
        headers: {
          accept: fixture.contentType.mediaType
        }
      })

      expect(res.ok).to.be.true()
      expect(res.headers.get('content-type')).to.equal(fixture.contentType.mediaType)
      expect(res.headers.get('etag')).to.equal(`"${cid}${fixture.contentType.etag}"`)
      expect(res.headers.get('x-content-type-options')).to.equal('nosniff')

      await fixture.verify(obj, cid, res)
    })
  }

  it.skip('should 501 when there is a path remainder', async () => {
    const obj = {
      hello: 'world',
      link: CID.parse('bafkqaddimvwgy3zao5xxe3debi')
    }
    const buf = dagCbor.encode(obj)
    const digest = await sha256.digest(buf)
    const cid = CID.createV1(dagCbor.code, digest)

    await helia.blockstore.put(cid, buf)

    const res = await verifiedFetch.fetch(`/ipfs/${cid}/link`)
    expect(res).to.have.property('status', 501)
  })
})
