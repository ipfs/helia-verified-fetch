import * as dagJson from '@ipld/dag-json'
import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { CID } from 'multiformats'
import { sha256 } from 'multiformats/hashes/sha2'
import { MEDIA_TYPE_DAG_JSON, MEDIA_TYPE_OCTET_STREAM, MEDIA_TYPE_RAW } from '../src/utils/content-types.ts'
import { VerifiedFetch } from '../src/verified-fetch.ts'
import { DAG_JSON_TRANSLATIONS } from './fixtures/codecs.ts'
import { createHelia } from './fixtures/create-offline-helia.ts'
import type { Helia } from 'helia'

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
    const buf = dagJson.encode(obj)
    const digest = await sha256.digest(buf)
    const cid = CID.createV1(dagJson.code, digest)

    await helia.blockstore.put(cid, buf)

    const res = await verifiedFetch.fetch(`/ipfs/${cid}`)
    expect(res.ok).to.be.true()
    expect(res.headers.get('content-type')).to.equal(MEDIA_TYPE_DAG_JSON)
    expect(res.headers.get('cache-control')).to.equal('public, max-age=29030400, immutable')

    const body = await res.arrayBuffer()
    const decoded = dagJson.decode(new Uint8Array(body))

    expect(decoded).to.deep.equal(obj)
  })

  for (const translation of DAG_JSON_TRANSLATIONS) {
    // eslint-disable-next-line no-loop-func
    it(`${translation.ok ? 'can' : 'can not'} download ${translation.input.name} blocks as ${translation.output.name}`, async () => {
      const buf = translation.input.encoded()
      const digest = await sha256.digest(buf)
      const cid = CID.createV1(translation.input.code, digest)

      await helia.blockstore.put(cid, buf)

      const res = await verifiedFetch.fetch(`/ipfs/${cid}`, {
        headers: {
          accept: translation.output.mediaType
        }
      })

      if (translation.ok) {
        expect(res.ok).to.be.true()
        expect(res.headers.get('content-type')).to.equal(translation.output.mediaType)
        expect(res.headers.get('cache-control')).to.equal('public, max-age=29030400, immutable')

        const body = await res.arrayBuffer()
        translation.input.decode(new Uint8Array(body))
      } else {
        expect(res.status).to.equal(406)

        expect(res.status).to.equal(406)

        const acceptable = (await res.json()).acceptable

        expect(acceptable).to.include(translation.input.mediaType)
        expect(acceptable).to.include(MEDIA_TYPE_RAW)
        expect(acceptable).to.include(MEDIA_TYPE_OCTET_STREAM)

        expect(acceptable).to.not.include(translation.output.mediaType)
      }
    })
  }

  it.skip('should 501 when there is a path remainder', async () => {
    const obj = {
      hello: 'world',
      link: CID.parse('bafkqaddimvwgy3zao5xxe3debi')
    }
    const block = dagJson.encode(obj)
    const digest = await sha256.digest(block)
    const cid = CID.createV1(dagJson.code, digest)

    await helia.blockstore.put(cid, block)

    const res = await verifiedFetch.fetch(`/ipfs/${cid}/link`)
    expect(res).to.have.property('status', 501)
  })
})
