import { unixfs } from '@helia/unixfs'
import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'
import { VerifiedFetch } from '../src/verified-fetch.js'
import { createHelia } from './fixtures/create-offline-helia.js'
import type { Helia } from '@helia/interface'

/**
 * Range request headers for IPFS gateways only support raw and unixfs
 */
describe('range requests', () => {
  let helia: Helia
  let verifiedFetch: VerifiedFetch
  const content = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

  beforeEach(async () => {
    helia = await createHelia()
    verifiedFetch = new VerifiedFetch({
      helia
    })
  })

  afterEach(async () => {
    await stop(helia, verifiedFetch)
  })

  interface SuccessfulTestExpectation {
    contentRange: string
    bytes: Uint8Array
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

    const responseContent = await response.arrayBuffer()
    expect(new Uint8Array(responseContent)).to.deep.equal(expected.bytes)
  }

  async function assertFailingRange (response: Promise<Response>): Promise<void> {
    await expect(response).to.eventually.have.property('status', 416)
    await expect(response).to.eventually.have.property('statusText', 'Requested Range Not Satisfiable')
  }

  function runTests (description: string, getCid: () => Promise<CID>): void {
    describe(description, () => {
      let cid: CID
      beforeEach(async () => {
        cid = await getCid()
      })
      const validTestCases = [
        {
          byteSize: 6,
          contentRange: 'bytes 0-5/11',
          rangeHeader: 'bytes=0-5',
          bytes: new Uint8Array([0, 1, 2, 3, 4, 5])
        },
        {
          byteSize: 8,
          contentRange: 'bytes 4-10/11',
          rangeHeader: 'bytes=4-',
          bytes: new Uint8Array([4, 5, 6, 7, 8, 9, 10])
        },
        {
          byteSize: 9,
          contentRange: 'bytes 2-10/11',
          rangeHeader: 'bytes=-9',
          bytes: new Uint8Array([2, 3, 4, 5, 6, 7, 8, 9, 10])
        }
      ]
      validTestCases.forEach(({ bytes, contentRange, rangeHeader }) => {
        // if these fail, check response-headers.spec.ts first
        it(`should return correct 206 Partial Content response for ${rangeHeader}`, async () => {
          const expected: SuccessfulTestExpectation = {
            bytes,
            contentRange
          }
          await testRange(cid, rangeHeader, expected)
        })
      })

      it('should return 416 Range Not Satisfiable when the range is invalid', async () => {
        await assertFailingRange(verifiedFetch.fetch(cid, {
          headers: {
            Range: 'bytes=-0-'
          }
        }))
        await assertFailingRange(verifiedFetch.fetch(cid, {
          headers: {
            Range: 'bytes=foobar'
          }
        }))
      })

      it('should return 416 Range Not Satisfiable when the range offset is larger than content', async () => {
        await assertFailingRange(verifiedFetch.fetch(cid, {
          headers: {
            Range: 'bytes=50-'
          }
        }))
      })

      it('should return 416 Range Not Satisfiable when the suffix-length is larger than content', async () => {
        await assertFailingRange(verifiedFetch.fetch(cid, {
          headers: {
            Range: 'bytes=-50'
          }
        }))
      })

      it('should return 416 Range Not Satisfiable when the range is out of bounds', async () => {
        await assertFailingRange(verifiedFetch.fetch(cid, {
          headers: {
            Range: 'bytes=0-900'
          }
        }))
      })

      it('should return valid response when passed multiple ranges', async () => {
        const response = await verifiedFetch.fetch(cid, {
          headers: {
            Range: 'bytes=0-2,3-5'
          }
        })
        expect(response.status).to.equal(206)
        expect(response.statusText).to.equal('Partial Content')
        expect(response.headers.get('content-type')).to.include('multipart/byteranges; boundary=multipart_byteranges_')
        const boundary = response.headers.get('content-type')?.split('=')[1]
        if (boundary == null) {
          throw new Error('boundary not found')
        }
        const content = await response.blob()
        const contentArray = await content.arrayBuffer()
        const body = new TextDecoder().decode(contentArray)

        // pull off the first line
        const lines = body.split('\r\n') // first line is blank, then the boundary
        expect(lines[1]).to.include(`--${boundary}`)
        expect(lines[2]).to.include('Content-Type: text/plain; charset=utf-8')
        expect(lines[3]).to.include('Content-Range: bytes 0-2/11')
        // blank line and then the content:
        expect(lines[4]).to.equal('')
        // content of the first part
        expect(new Uint8Array(new TextEncoder().encode(lines[5]))).to.deep.equal(new Uint8Array([0, 1, 2]))

        expect(lines[6]).to.include(`--${boundary}`)
        expect(lines[7]).to.include('Content-Type: text/plain; charset=utf-8')
        expect(lines[8]).to.include('Content-Range: bytes 3-5/11')
        expect(lines[9]).to.equal('')
        expect(new Uint8Array(new TextEncoder().encode(lines[10]))).to.deep.equal(new Uint8Array([3, 4, 5]))

        // final boundary
        expect(lines[11]).to.include(`--${boundary}--`)
      })
    })
  }

  const testTuples = [
    ['unixfs', async () => {
      return unixfs(helia).addBytes(content)
    }],
    ['raw', async () => {
      const buf = raw.encode(content)
      const cid = CID.createV1(raw.code, await sha256.digest(buf))
      await helia.blockstore.put(cid, buf)
      return cid
    }]
  ] as const

  testTuples.forEach(([name, fn]) => {
    runTests(name, fn)
  })
})
