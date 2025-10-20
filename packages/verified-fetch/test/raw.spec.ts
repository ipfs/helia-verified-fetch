import { dagCbor } from '@helia/dag-cbor'
import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import toBuffer from 'it-to-buffer'
import { stubInterface } from 'sinon-ts'
import { VerifiedFetch } from '../src/verified-fetch.js'
import { createHelia } from './fixtures/create-offline-helia.js'
import type { Helia } from '@helia/interface'
import type { IPNSResolver } from '@helia/ipns'
import type { StubbedInstance } from 'sinon-ts'

describe('raw blocks', () => {
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

  it('should support fetching a raw block', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)
    const block = await toBuffer(helia.blockstore.get(cid))

    const resp = await verifiedFetch.fetch(`ipfs://${cid}`, {
      headers: {
        accept: 'application/vnd.ipld.raw'
      }
    })
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('content-type')).to.equal('application/vnd.ipld.raw')
    expect(resp.headers.get('content-length')).to.equal(block.byteLength.toString())
    expect(resp.headers.get('x-ipfs-roots')).to.equal(cid.toV1().toString())

    const buf = new Uint8Array(await resp.arrayBuffer())
    expect(buf).to.equalBytes(block)
  })
})
