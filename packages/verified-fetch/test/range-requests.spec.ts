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

  interface SuccessfulTestExpectation {
    contentRange?: string
    byteSize?: number
  }
  async function testRange (cid: CID, headerRange: string, expected: SuccessfulTestExpectation): Promise<void> {
    const response = await verifiedFetch.fetch(cid, {
      headers: {
        Range: headerRange
      }
    })

    expect(response.status).to.equal(206)
    expect(response.statusText).to.equal('Partial Content')

    expect(response).to.have.property('headers')
    const contentRange = response.headers.get('content-range')
    expect(contentRange).to.be.ok()
    expect(contentRange).to.equal(expected.contentRange) // the response should include the range that was requested

    const content = await response.arrayBuffer()
    expect(content.byteLength).to.equal(expected.byteSize) // the length of the data should match the requested range
  }

  async function assertFailingRange (response: Promise<Response>): Promise<void> {
    await expect(response).to.eventually.have.property('status', 416)
    await expect(response).to.eventually.have.property('statusText', 'Requested Range Not Satisfiable')
  }

  describe('unixfs', () => {
    it('should return correct 206 Partial Content response for byte=<range-start>-<range-end>', async () => {
      const expected: SuccessfulTestExpectation = {
        byteSize: 6,
        contentRange: 'bytes 0-5/11'
      }
      await testRange(dagPbCid, 'bytes=0-5', expected)
    })

    it('should return correct 206 Partial Content response for byte=<range-start>-', async () => {
      const expected = {
        byteSize: 7,
        contentRange: 'bytes 4-11/11'
      }
      await testRange(dagPbCid, 'bytes=4-', expected)
    })

    it('should return correct 206 Partial Content response for byte=-<suffix-length>', async () => {
      const expected = {
        byteSize: 9,
        contentRange: 'bytes 2-10/11'
      }
      await testRange(dagPbCid, 'bytes=-9', expected)
    })

    it('should return 416 Range Not Satisfiable when the range is invalid', async () => {
      await assertFailingRange(verifiedFetch.fetch(dagPbCid, {
        headers: {
          Range: 'bytes=-0-'
        }
      }))
      await assertFailingRange(verifiedFetch.fetch(dagPbCid, {
        headers: {
          Range: 'bytes=foobar'
        }
      }))
    })

    it('should return 416 Range Not Satisfiable when the range offset is larger than content', async () => {
      await assertFailingRange(verifiedFetch.fetch(dagPbCid, {
        headers: {
          Range: 'bytes=50-'
        }
      }))
    })

    it('should return 416 Range Not Satisfiable when the suffix-length is larger than content', async () => {
      await assertFailingRange(verifiedFetch.fetch(dagPbCid, {
        headers: {
          Range: 'bytes=-50'
        }
      }))
    })

    it('should return 416 Range Not Satisfiable when the range is out of bounds', async () => {
      await assertFailingRange(verifiedFetch.fetch(dagPbCid, {
        headers: {
          Range: 'bytes=0-900'
        }
      }))
    })

    it('should return 416 Range Not Satisfiable when passed multiple ranges', async () => {
      await assertFailingRange(verifiedFetch.fetch(dagPbCid, {
        headers: {
          Range: 'bytes=0-2,3-5'
        }
      }))
    })
  })
})
