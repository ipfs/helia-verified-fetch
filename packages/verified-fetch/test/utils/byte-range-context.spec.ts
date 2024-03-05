import { prefixLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { ByteRangeContext } from '../../src/utils/byte-range-context.js'

/**
 * You can construct a readable stream that contains a certain number of bytes,
 * of a given size (chunkSize) or 1 byte by default. The Uint8Arrays in each chunk
 * will be filled with the current index of the chunk.
 *
 * @example
 * const stream = readableStreamOfSize(5) // Uint8Array(5) [0, 1, 2, 3, 4]
 * const stream = readableStreamOfSize(5, 2) // Uint8Array(5) [0, 0, 1, 1, 2]
 * const stream = readableStreamOfSize(5, 3) // Uint8Array(5) [0, 0, 0, 1, 1]
 * const stream = readableStreamOfSize(5, 5) // Uint8Array(5) [0, 0, 0, 0, 0]
 */
function readableStreamOfSize (totalBytes: number, chunkSize: number = 1): ReadableStream<Uint8Array> {
  let i = 0
  let bytesEnqueued = 0
  return new ReadableStream({
    pull (controller) {
      if (bytesEnqueued >= totalBytes) {
        controller.close()
        return
      }
      const sizeForChunk = Math.min(totalBytes - bytesEnqueued, chunkSize)
      const chunk = new Uint8Array(sizeForChunk)
      controller.enqueue(chunk.fill(i++))
      bytesEnqueued += sizeForChunk
    }
  })
}

async function streamToUint8Array (stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  return new Response(stream).arrayBuffer().then(buffer => new Uint8Array(buffer))
}

describe('ByteRangeContext', () => {
  const logger = prefixLogger('test')

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
    expect(context.fileSize).to.equal(body.length)
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

  // it('should correctly slice body with valid range headers', () => {
  const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  const uint8arrayRangeTests = [
    // full ranges:
    { type: 'Uint8Array', range: 'bytes=0-11', contentRange: 'bytes 0-11/11', body: new Uint8Array(array), expected: new Uint8Array(array) },
    { type: 'Uint8Array', range: 'bytes=-11', contentRange: 'bytes 0-11/11', body: new Uint8Array(array), expected: new Uint8Array(array) },
    { type: 'Uint8Array', range: 'bytes=0-', contentRange: 'bytes 0-11/11', body: new Uint8Array(array), expected: new Uint8Array(array) },

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
    { type: 'Uint8Array', range: 'bytes=1-', contentRange: 'bytes 1-11/11', body: new Uint8Array(array), expected: new Uint8Array(array.slice(1)) },
    { type: 'Uint8Array', range: 'bytes=2-', contentRange: 'bytes 2-11/11', body: new Uint8Array(array), expected: new Uint8Array(array.slice(2)) },
    { type: 'Uint8Array', range: 'bytes=-2', contentRange: 'bytes 10-11/11', body: new Uint8Array(array), expected: new Uint8Array(array.slice(-2)) },

    // single byte ranges:
    { type: 'Uint8Array', range: 'bytes=1-1', contentRange: 'bytes 1-1/11', body: new Uint8Array(array), expected: new Uint8Array(array.slice(1, 2)) },
    { type: 'Uint8Array', range: 'bytes=-1', contentRange: 'bytes 11-11/11', body: new Uint8Array(array), expected: new Uint8Array(array.slice(-1)) }

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
    }))
    // // Uint8Arrays
    // // suffix range only
    // // explicit full range
    // // ArrayBuffers
    // { type: 'ArrayBuffer', range: 'bytes=0-2', contentRange: 'bytes 0-2/5', body: new Uint8Array(array).buffer, expected: new Uint8Array([1, 2, 3]).buffer },
    // { type: 'ArrayBuffer', range: 'bytes=0-5', contentRange: 'bytes 0-5/11', body: new Uint8Array(array).buffer, expected: new Uint8Array([1, 2, 3, 4, 5, 6]).buffer },
    // { type: 'ArrayBuffer', range: 'bytes=1-1', contentRange: 'bytes 1-1/5', body: new Uint8Array(array).buffer, expected: new Uint8Array([2]).buffer },
    // { type: 'ArrayBuffer', range: 'bytes=2-', contentRange: 'bytes 2-5/5', body: new Uint8Array(array).buffer, expected: new Uint8Array([3, 4, 5]).buffer },
    // { type: 'ArrayBuffer', range: 'bytes=-2', contentRange: 'bytes 4-5/5', body: new Uint8Array(array).buffer, expected: new Uint8Array([4, 5]).buffer },
    // // Blobs
    // { type: 'Blob', range: 'bytes=0-2', contentRange: 'bytes 0-2/5', body: new Blob([new Uint8Array(array)]), expected: new Blob([new Uint8Array([1, 2, 3])]) },
    // { type: 'Blob', range: 'bytes=0-5', contentRange: 'bytes 0-5/11', body: new Blob([new Uint8Array(array)]), expected: new Blob([new Uint8Array([1, 2, 3, 4, 5, 6])]) },
    // { type: 'Blob', range: 'bytes=1-1', contentRange: 'bytes 1-1/5', body: new Blob([new Uint8Array(array)]), expected: new Blob([new Uint8Array([2])]) },
    // { type: 'Blob', range: 'bytes=2-', contentRange: 'bytes 2-5/5', body: new Blob([new Uint8Array(array)]), expected: new Blob([new Uint8Array([3, 4, 5])]) },
    // { type: 'Blob', range: 'bytes=-2', contentRange: 'bytes 4-5/5', body: new Blob([new Uint8Array(array)]), expected: new Blob([new Uint8Array([4, 5])]) }
  ]
  validRanges.forEach(({ type, range, expected, body, contentRange }) => {
    it(`should correctly slice ${type} body with range ${range}`, () => {
      const context = new ByteRangeContext(logger, { Range: range })
      context.setBody(body)
      expect(context.getBody()).to.deep.equal(expected)
      expect(context.contentRangeHeaderValue).to.equal(contentRange)
    })
  })

  describe('handling ReadableStreams', () => {
    it('readableStreamOfSize', async () => {
      await expect(streamToUint8Array(readableStreamOfSize(5))).to.eventually.deep.equal(new Uint8Array([0, 1, 2, 3, 4]))
      await expect(streamToUint8Array(readableStreamOfSize(5, 2))).to.eventually.deep.equal(new Uint8Array([0, 0, 1, 1, 2]))
      await expect(streamToUint8Array(readableStreamOfSize(5, 3))).to.eventually.deep.equal(new Uint8Array([0, 0, 0, 1, 1]))
      await expect(streamToUint8Array(readableStreamOfSize(5, 4))).to.eventually.deep.equal(new Uint8Array([0, 0, 0, 0, 1]))
      await expect(streamToUint8Array(readableStreamOfSize(5, 5))).to.eventually.deep.equal(new Uint8Array([0, 0, 0, 0, 0]))
    })
    it('should correctly handle bytes=1-5', async () => {
      const context = new ByteRangeContext(logger, { Range: 'bytes=1-5' })
      const body = readableStreamOfSize(5, 2)
      context.setBody(body)
      expect(context.fileSize).to.be.null()
      expect(context.contentRangeHeaderValue).to.equal('bytes 1-5/*')
      // first three bytes
      const processedBody = context.getBody() as ReadableStream<Uint8Array>
      expect(processedBody).to.not.be.null()
      await expect(streamToUint8Array(processedBody)).to.eventually.deep.equal(new Uint8Array([0, 1, 1, 2]))
    })

    it('should correctly handle bytes=2-3', async () => {
      const context = new ByteRangeContext(logger, { Range: 'bytes=2-3' })
      const body = readableStreamOfSize(5, 2)
      context.setBody(body)
      expect(context.fileSize).to.be.null()
      expect(context.contentRangeHeaderValue).to.equal('bytes 2-3/*')
      const processedBody = context.getBody() as ReadableStream<Uint8Array>
      expect(processedBody).to.not.be.null()
      await expect(streamToUint8Array(processedBody)).to.eventually.deep.equal(new Uint8Array([1, 1]))
    })

    it('should correctly handle "bytes=1-"', async () => {
      const context = new ByteRangeContext(logger, { Range: 'bytes=1-' })
      const body = readableStreamOfSize(5)
      context.setBody(body)
      expect(context.fileSize).to.be.null()
      expect(context.contentRangeHeaderValue).to.equal('bytes 1-*/*')
      const processedBody = context.getBody() as ReadableStream<Uint8Array>
      const result = await streamToUint8Array(processedBody)
      expect(processedBody).to.not.be.null()
      expect(result).to.be.ok()
      expect(result).to.deep.equal(new Uint8Array([1, 2, 3, 4]))
    })

    it('should correctly handle bytes=-3', async () => {
      const context = new ByteRangeContext(logger, { Range: 'bytes=-3' })
      const body = readableStreamOfSize(5, 2) // Uint8Array(5) [0, 0, 1, 1, 2]
      context.setBody(body)
      expect(context.fileSize).to.be.null()
      expect(context.contentRangeHeaderValue).to.equal('bytes *-3/*') // check TODO in contentRangeHeaderValue getter if this feels wrong.
      const processedBody = context.getBody() as ReadableStream<Uint8Array>
      expect(processedBody).to.not.be.null()
      await expect(streamToUint8Array(processedBody)).to.eventually.deep.equal(new Uint8Array([1, 1, 2]))
    })

    it('should correctly handle bytes=0-5', async () => {
      const context = new ByteRangeContext(logger, { Range: 'bytes=0-5' })
      const body = new ReadableStream({
        pull (controller) {
          controller.enqueue(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]))
          controller.close()
        }
      })
      context.setBody(body)
      expect(context.fileSize).to.be.null()
      expect(context.contentRangeHeaderValue).to.equal('bytes 0-5/*') // check TODO in contentRangeHeaderValue getter if this feels wrong.
      const processedBody = context.getBody() as ReadableStream<Uint8Array>
      expect(processedBody).to.not.be.null()
      await expect(streamToUint8Array(processedBody)).to.eventually.deep.equal(new Uint8Array([0, 1, 2, 3, 4, 5]))
    })

    it('should correctly handle bytes=-4', async () => {
      let context = new ByteRangeContext(logger, { Range: 'bytes=-4' })
      let body = readableStreamOfSize(11, 2) // Uint8Array(5) [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5]
      context.setBody(body)
      expect(context.fileSize).to.be.null()
      expect(context.contentRangeHeaderValue).to.equal('bytes *-4/*') // check TODO in contentRangeHeaderValue getter if this feels wrong.
      let processedBody = context.getBody() as ReadableStream<Uint8Array>
      expect(processedBody).to.not.be.null()
      await expect(streamToUint8Array(processedBody)).to.eventually.deep.equal(new Uint8Array([3, 4, 4, 5]))

      context = new ByteRangeContext(logger, { Range: 'bytes=-4' })
      body = new ReadableStream({
        pull (controller) {
          controller.enqueue(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]))
          controller.close()
        }
      })
      context.setBody(body)
      expect(context.fileSize).to.be.null()
      expect(context.contentRangeHeaderValue).to.equal('bytes *-4/*') // check TODO in contentRangeHeaderValue getter if this feels wrong.
      processedBody = context.getBody() as ReadableStream<Uint8Array>
      expect(processedBody).to.not.be.null()
      await expect(streamToUint8Array(processedBody)).to.eventually.deep.equal(new Uint8Array([8, 9, 10, 11]))
    })
  })
})
