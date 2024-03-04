import { unixfs, type UnixFS } from '@helia/unixfs'
import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { type CID } from 'multiformats/cid'
import { VerifiedFetch } from '../src/verified-fetch.js'
import { createHelia } from './fixtures/create-offline-helia.js'
import type { Helia } from '@helia/interface'

/**
 * Range request headers for IPFS gateways only support raw and unixfs
 */
describe('range requests', () => {
  let helia: Helia
  let verifiedFetch: VerifiedFetch
  let fs: UnixFS
  let dagPbCid: CID

  beforeEach(async () => {
    helia = await createHelia()
    fs = unixfs(helia)
    verifiedFetch = new VerifiedFetch({
      helia
    })

    dagPbCid = await fs.addFile({
      path: 'bigbuckbunny.mp4',
      content: new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    }, {
      rawLeaves: false,
      leafType: 'file'
    })
  })

  afterEach(async () => {
    await stop(helia, verifiedFetch)
  })

  async function testRange (cid: CID, range: { start: number, end: number }): Promise<void> {
    const response = await verifiedFetch.fetch(cid, {
      headers: {
        Range: `bytes=${range.start}-${range.end}`
      }
    })

    expect(response.status).to.equal(206)
    expect(response.statusText).to.equal('Partial Content')

    expect(response).to.have.property('headers')
    expect(response.headers).to.have.property('content-range')
    expect(response.headers.get('content-range')).to.equal(`bytes ${range.start}-${range.end}/*`) // the response should include the range that was requested

    const content = await response.arrayBuffer()
    expect(content.byteLength).to.equal(range.end - range.start + 1) // the length of the data should match the requested range
  }

  it('should return 206 Partial Content with correct byte range for unixfs', async () => {
    await expect(testRange(dagPbCid, { start: 0, end: 500 })).to.eventually.not.be.rejected()
  })

  it('should return 416 Range Not Satisfiable when the range is out of bounds', async () => {
    const response = await verifiedFetch.fetch(dagPbCid, {
      headers: {
        Range: 'bytes=50-900'
      }
    })
    expect(response.status).to.equal(416)
    expect(response.statusText).to.equal('Requested Range Not Satisfiable')
  })
})
