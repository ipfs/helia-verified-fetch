import { prefixLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { ByteRangeContext } from '../../src/utils/byte-range-context.js'

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
    context.body = body
    expect(context.body).to.equal(body)
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
  const validRanges = [
    // Uint8Arrays
    { type: 'Uint8Array', range: 'bytes=0-2', contentRange: 'bytes 0-2/5', body: new Uint8Array([1, 2, 3, 4, 5]), expected: new Uint8Array([1, 2, 3]) },
    { type: 'Uint8Array', range: 'bytes=2-', contentRange: 'bytes 2-5/5', body: new Uint8Array([1, 2, 3, 4, 5]), expected: new Uint8Array([3, 4, 5]) },
    { type: 'Uint8Array', range: 'bytes=-2', contentRange: 'bytes 3-5/5', body: new Uint8Array([1, 2, 3, 4, 5]), expected: new Uint8Array([4, 5]) },
    // ArrayBuffers
    { type: 'ArrayBuffer', range: 'bytes=0-2', contentRange: 'bytes 0-2/5', body: new Uint8Array([1, 2, 3, 4, 5]).buffer, expected: new Uint8Array([1, 2, 3]).buffer },
    { type: 'ArrayBuffer', range: 'bytes=2-', contentRange: 'bytes 2-5/5', body: new Uint8Array([1, 2, 3, 4, 5]).buffer, expected: new Uint8Array([3, 4, 5]).buffer },
    { type: 'ArrayBuffer', range: 'bytes=-2', contentRange: 'bytes 3-5/5', body: new Uint8Array([1, 2, 3, 4, 5]).buffer, expected: new Uint8Array([4, 5]).buffer },
    // Blobs
    { type: 'Blob', range: 'bytes=0-2', contentRange: 'bytes 0-2/5', body: new Blob([new Uint8Array([1, 2, 3, 4, 5])]), expected: new Blob([new Uint8Array([1, 2, 3])]) },
    { type: 'Blob', range: 'bytes=2-', contentRange: 'bytes 2-5/5', body: new Blob([new Uint8Array([1, 2, 3, 4, 5])]), expected: new Blob([new Uint8Array([3, 4, 5])]) },
    { type: 'Blob', range: 'bytes=-2', contentRange: 'bytes 3-5/5', body: new Blob([new Uint8Array([1, 2, 3, 4, 5])]), expected: new Blob([new Uint8Array([4, 5])]) }
  ]
  validRanges.forEach(({ type, range, expected, body, contentRange }) => {
    it(`should correctly slice ${type} body with range ${range}`, () => {
      const context = new ByteRangeContext(logger, { Range: range })
      context.body = body
      expect(context.body).to.deep.equal(expected)
      expect(context.contentRangeHeaderValue).to.equal(contentRange)
    })
  })
  // })

  it('should correctly handle ReadableStreams', () => {
    const context = new ByteRangeContext(logger, { Range: 'bytes=0-2' })
    let i = 0
    const body = new ReadableStream({
      pull (controller) {
        if (i >= 3) {
          controller.close()
          return
        }
        controller.enqueue(new Uint8Array([i++]))
      }
    })
    context.body = body
    expect(context.body).to.equal(body)
    expect(context.fileSize).to.be.null()
    expect(context.contentRangeHeaderValue).to.equal('bytes 0-2/*')
  })
})
