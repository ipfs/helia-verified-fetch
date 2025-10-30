import { unixfs } from '@helia/unixfs'
import { stop } from '@libp2p/interface'
import { prefixLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import browserReadableStreamToIt from 'browser-readablestream-to-it'
import all from 'it-all'
import { ByteRangeContext } from '../../src/utils/byte-range-context.js'
import { getStreamFromAsyncIterable } from '../../src/utils/get-stream-from-async-iterable.js'
import { createHelia } from '../fixtures/create-offline-helia.js'
import type { UnixFS } from '@helia/unixfs'
import type { Helia } from 'helia'
import type { CID } from 'multiformats/cid'

describe('ByteRangeContext', () => {
  const logger = prefixLogger('test').forComponent('test')

  it('should correctly detect range request', () => {
    const context = new ByteRangeContext(logger, { Range: 'bytes=0-2' })
    expect(context.isRangeRequest).to.be.true()
  })

  it('should correctly detect non-range request', () => {
    const context = new ByteRangeContext(logger, {})
    expect(context.isRangeRequest).to.be.false()
  })

  it('should correctly set body and calculate fileSize', () => {
    const context = new ByteRangeContext(logger, {})
    const body = new Uint8Array([1, 2, 3, 4, 5])
    context.setBody(body)
    expect(context.getBody()).to.equal(body)
    expect(context.getFileSize()).to.equal(body.length)
  })

  it('should correctly handle invalid range request', () => {
    const invalidRanges = [
      'bytes=f',
      'bytes=0-foobar',
      'bytes=f-0',
      'byte=0-2'
    ]
    invalidRanges.forEach(range => {
      const context = new ByteRangeContext(logger, { Range: range })
      expect(context.isValidRangeRequest).to.be.false()
    })
  })

  const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  const largeArray = Array.from({ length: 3000 }, (_, i) => i + 1)
  const uint8arrayRangeTests = [
    // full ranges:
    { type: 'Uint8Array', range: 'bytes=0-10', contentRange: 'bytes 0-10/11', body: new Uint8Array(array), expected: new Uint8Array(array) },
    { type: 'Uint8Array', range: 'bytes=-11', contentRange: 'bytes 0-10/11', body: new Uint8Array(array), expected: new Uint8Array(array) },
    { type: 'Uint8Array', range: 'bytes=0-', contentRange: 'bytes 0-10/11', body: new Uint8Array(array), expected: new Uint8Array(array) },

    // partial ranges:
    { type: 'Uint8Array', range: 'bytes=0-1', contentRange: 'bytes 0-1/11', body: new Uint8Array(array), expected: new Uint8Array([1, 2]) },
    { type: 'Uint8Array', range: 'bytes=0-2', contentRange: 'bytes 0-2/11', body: new Uint8Array(array), expected: new Uint8Array([1, 2, 3]) },
    { type: 'Uint8Array', range: 'bytes=0-3', contentRange: 'bytes 0-3/11', body: new Uint8Array(array), expected: new Uint8Array([1, 2, 3, 4]) },
    { type: 'Uint8Array', range: 'bytes=0-4', contentRange: 'bytes 0-4/11', body: new Uint8Array(array), expected: new Uint8Array([1, 2, 3, 4, 5]) },
    { type: 'Uint8Array', range: 'bytes=0-5', contentRange: 'bytes 0-5/11', body: new Uint8Array(array), expected: new Uint8Array([1, 2, 3, 4, 5, 6]) },
    { type: 'Uint8Array', range: 'bytes=0-6', contentRange: 'bytes 0-6/11', body: new Uint8Array(array), expected: new Uint8Array([1, 2, 3, 4, 5, 6, 7]) },
    { type: 'Uint8Array', range: 'bytes=0-7', contentRange: 'bytes 0-7/11', body: new Uint8Array(array), expected: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]) },
    { type: 'Uint8Array', range: 'bytes=0-8', contentRange: 'bytes 0-8/11', body: new Uint8Array(array), expected: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]) },
    { type: 'Uint8Array', range: 'bytes=0-9', contentRange: 'bytes 0-9/11', body: new Uint8Array(array), expected: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) },
    { type: 'Uint8Array', range: 'bytes=0-10', contentRange: 'bytes 0-10/11', body: new Uint8Array(array), expected: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) },
    { type: 'Uint8Array', range: 'bytes=1-', contentRange: 'bytes 1-10/11', body: new Uint8Array(array), expected: new Uint8Array([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) },
    { type: 'Uint8Array', range: 'bytes=2-', contentRange: 'bytes 2-10/11', body: new Uint8Array(array), expected: new Uint8Array([3, 4, 5, 6, 7, 8, 9, 10, 11]) },
    { type: 'Uint8Array', range: 'bytes=-2', contentRange: 'bytes 9-10/11', body: new Uint8Array(array), expected: new Uint8Array(array.slice(-2)) },
    { type: 'Uint8Array', range: 'bytes=1000-2000', contentRange: 'bytes 1000-2000/3000', body: new Uint8Array(largeArray), expected: new Uint8Array(largeArray.slice(1000, 2001)) }, // https://github.com/ipfs/helia-verified-fetch/issues/184

    // single byte ranges:
    { type: 'Uint8Array', range: 'bytes=1-1', contentRange: 'bytes 1-1/11', body: new Uint8Array(array), expected: new Uint8Array(array.slice(1, 2)) },
    { type: 'Uint8Array', range: 'bytes=-1', contentRange: 'bytes 10-10/11', body: new Uint8Array(array), expected: new Uint8Array(array.slice(-1)) }

  ]

  const validRanges = [
    ...uint8arrayRangeTests,
    ...uint8arrayRangeTests.map(({ range, contentRange, body, expected }) => ({
      type: 'ArrayBuffer',
      range,
      contentRange,
      body: body.buffer,
      expected: expected.buffer
    })),
    ...uint8arrayRangeTests.map(({ range, contentRange, body, expected }) => ({
      type: 'Blob',
      range,
      contentRange,
      body: new Blob([body]),
      expected: new Blob([expected])
    })),

    // multiple ranges:
    { type: 'multipart-Uint8Array', range: 'bytes=0-1,2-3', contentRange: 'error', body: new Uint8Array(array), expected: [new Uint8Array([1, 2]), new Uint8Array([3, 4])] },
    { type: 'multipart-Uint8Array', range: 'bytes=0-1,-2, 5-6', contentRange: 'error', body: new Uint8Array(array), expected: [new Uint8Array([1, 2]), new Uint8Array([...array.slice(-2)]), new Uint8Array([6, 7])] }
  ]

  validRanges.forEach(({ type, range, expected, body, contentRange }) => {
    it(`should correctly slice ${type} body with range ${range}`, async () => {
      const context = new ByteRangeContext(logger, { Range: range })

      context.setBody(body)
      const actualBody = context.getBody()

      if (type === 'multipart-Uint8Array' && actualBody instanceof ReadableStream) {
        // actualBody is a ReadableStream
        const bodyAsUint8Array = await all(browserReadableStreamToIt(actualBody))
        const expectedAsUint8Array = expected as Uint8Array[]

        const getContentForExpectedPart = (index: number): Uint8Array => {
          if (index === 0) {
            return bodyAsUint8Array[1]
          }
          return bodyAsUint8Array[index * 2 + 1]
        }

        const textDecoder = new TextDecoder()
        const getContentHeaderForExpectedRange = (index: number): string => {
          if (index === 0) {
            return textDecoder.decode(bodyAsUint8Array[0])
          }
          return textDecoder.decode(bodyAsUint8Array[index * 2])
        }

        // ensure each expected is in the body
        expect(bodyAsUint8Array).to.have.lengthOf(expectedAsUint8Array.length * 2 + 1)
        expectedAsUint8Array.forEach((expected: Uint8Array, i: number) => {
          expect(getContentForExpectedPart(i)).to.deep.equal(expected)
        })
        const rangeParts = range.split('=')[1].split(',')
        rangeParts.forEach((part, index) => {
          if (part.startsWith('-')) {
            part = `${(body as Uint8Array).length - Number(part.slice(1))}-${(body as Uint8Array).length - 1}`
          }
          const [start, end] = part.split('-').map(Number)
          const header = getContentHeaderForExpectedRange(index);

          ['--multipart_byteranges_', 'Content-Type: application/octet-stream', `Content-Range: bytes ${start}-${end}/${(body as Uint8Array).length}`].forEach(part => {
            expect(header).to.include(part)
          })
        })
      } else if (actualBody instanceof Blob || type === 'Blob') {
        const bodyAsUint8Array = new Uint8Array(await (actualBody as Blob).arrayBuffer())
        const expectedAsUint8Array = new Uint8Array(await (expected as Blob).arrayBuffer())
        // loop through the bytes and compare them
        for (let i = 0; i < bodyAsUint8Array.length; i++) {
          expect(bodyAsUint8Array[i]).to.equal(expectedAsUint8Array[i])
        }
      } else {
        expect(actualBody).to.deep.equal(expected)
      }

      if (contentRange === 'error') {
        expect(() => context.contentRangeHeaderValue).to.throw('Content-Range header not applicable for multipart responses')
      } else {
        expect(context.contentRangeHeaderValue).to.equal(contentRange)
      }
    })
  })

  describe('handling ReadableStreams', () => {
    let helia: Helia
    let fs: UnixFS
    let cid: CID
    const getBodyStream = async (offset?: number, length?: number): Promise<ReadableStream<Uint8Array>> => {
      const iter = fs.cat(cid, { offset, length })
      const { stream } = await getStreamFromAsyncIterable(iter)
      return stream
    }

    before(async () => {
      helia = await createHelia()
      fs = unixfs(helia)
    })

    after(async () => {
      await stop(helia)
    })

    uint8arrayRangeTests.forEach(({ range, expected, body, contentRange }) => {
      it(`should correctly slice Stream with range ${range}`, async () => {
        const context = new ByteRangeContext(logger, { Range: range })
        cid = await fs.addBytes(body)
        const stat = await fs.stat(cid)
        context.setFileSize(stat.size)
        context.setBody(await getBodyStream(context.getByteRanges()[0].start, context.getLength(context.getByteRanges()[0])))
        const response = new Response(context.getBody())
        const bodyResult = await response.arrayBuffer()
        expect(context.contentRangeHeaderValue).to.equal(contentRange)
        expect(new Uint8Array(bodyResult)).to.deep.equal(expected)
      })
    })
  })
})
