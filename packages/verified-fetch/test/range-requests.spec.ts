import { unixfs } from '@helia/unixfs'
import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
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
    verifiedFetch = new VerifiedFetch(helia)
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
    expect(new Uint8Array(responseContent)).to.equalBytes(expected.bytes)
  }

  async function assertFailingRange (response: Promise<Response>): Promise<void> {
    await expect(response).to.eventually.have.property('status', 416)
    await expect(response).to.eventually.have.property('statusText', 'Range Not Satisfiable')
  }

  function runTests (description: string, getCid: () => Promise<{ cid: CID, content: Uint8Array }>): void {
    describe(description, () => {
      let cid: CID
      let content: Uint8Array

      beforeEach(async () => {
        ({ cid, content } = await getCid())
      })

      const validTestCases = [{
        byteSize: 6,
        contentRange: 'bytes 0-5/11',
        rangeHeader: 'bytes=0-5',
        start: 0,
        end: 6
      }, {
        byteSize: 8,
        contentRange: 'bytes 4-10/11',
        rangeHeader: 'bytes=4-',
        start: 4,
        end: 11
      }, {
        byteSize: 9,
        contentRange: 'bytes 2-10/11',
        rangeHeader: 'bytes=-9',
        start: 2,
        end: 11
      }]

      validTestCases.forEach(({ start, end, contentRange, rangeHeader }) => {
        // if these fail, check response-headers.spec.ts first
        it(`should return 206 Partial Content response for ${rangeHeader}`, async () => {
          const bytes = content.subarray(start, end)

          await testRange(cid, rangeHeader, {
            bytes,
            contentRange
          })
        })
      })

      const invalidTestCases = [{
        reason: 'the range is invalid',
        rangeHeader: 'bytes=-0-'
      }, {
        reason: 'the range is not parseable',
        rangeHeader: 'bytes=foobar'
      }, {
        reason: 'the range offset is larger than content',
        rangeHeader: 'bytes=50-'
      }, {
        reason: 'the suffix-length is larger than content',
        rangeHeader: 'bytes=-50'
      }, {
        reason: 'the range is out of bounds',
        rangeHeader: 'bytes=0-900'
      }]

      invalidTestCases.forEach(({ reason, rangeHeader }) => {
        // if these fail, check response-headers.spec.ts first
        it(`should return 416 Range Not Satisfiable when ${reason}`, async () => {
          await assertFailingRange(verifiedFetch.fetch(cid, {
            headers: {
              Range: rangeHeader
            }
          }))
        })
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

        const body = await response.text()

        const lines = body.split('\r\n')
        expect(lines[0]).to.include(`--${boundary}`)
        expect(lines[1]).to.include('Content-Type: application/octet-stream')
        expect(lines[2]).to.include('Content-Range: bytes 0-2/11')
        // blank line and then the content:
        expect(lines[3]).to.equal('')
        // content of the first part
        expect(new TextEncoder().encode(lines[4])).to.equalBytes(content.subarray(0, 3))

        expect(lines[5]).to.include(`--${boundary}`)
        expect(lines[6]).to.include('Content-Type: application/octet-stream')
        expect(lines[7]).to.include('Content-Range: bytes 3-5/11')
        expect(lines[8]).to.equal('')
        expect(new TextEncoder().encode(lines[9])).to.equalBytes(content.subarray(3, 6))

        // final boundary
        expect(lines[10]).to.include(`--${boundary}--`)
      })
    })
  }

  const testTuples = [
    ['unixfs', async () => {
      const content = uint8ArrayFromString('hello world')
      const cid = await unixfs(helia).addBytes(content)

      return {
        cid,
        content
      }
    }],
    ['raw', async () => {
      const buf = raw.encode(content)
      const cid = CID.createV1(raw.code, await sha256.digest(buf))
      await helia.blockstore.put(cid, buf)
      return {
        cid,
        content
      }
    }]
  ] as const

  testTuples.forEach(([name, fn]) => {
    runTests(name, fn)
  })
})
