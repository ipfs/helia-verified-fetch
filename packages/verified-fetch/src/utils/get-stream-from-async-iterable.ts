import { AbortError } from '@libp2p/interface'
import { CustomProgressEvent } from 'progress-events'
import { NoContentError } from '../errors.js'
import type { VerifiedFetchInit } from '../index.js'

/**
 * Converts an async iterator of Uint8Array bytes to a stream and returns the first chunk of bytes
 */
export async function getStreamFromAsyncIterable (iterator: AsyncIterable<Uint8Array>, options?: Pick<VerifiedFetchInit, 'onProgress' | 'signal'>): Promise<{ stream: ReadableStream<Uint8Array>, firstChunk: Uint8Array }> {
  const reader = iterator[Symbol.asyncIterator]()
  const { value: firstChunk, done } = await reader.next()

  if (done === true) {
    throw new NoContentError()
  }

  const stream = new ReadableStream({
    async start (controller) {
      // the initial value is already available
      options?.onProgress?.(new CustomProgressEvent<void>('verified-fetch:request:progress:chunk'))
      controller.enqueue(firstChunk)
    },
    async pull (controller) {
      const { value, done } = await reader.next()
      if (options?.signal?.aborted) {
        controller.error(new AbortError(options.signal.reason ?? 'signal aborted by user'))
        controller.close()
        return
      }

      if (done === true) {
        if (value != null) {
          options?.onProgress?.(new CustomProgressEvent<void>('verified-fetch:request:progress:chunk'))
          controller.enqueue(value)
        }
        controller.close()
        return
      }

      options?.onProgress?.(new CustomProgressEvent<void>('verified-fetch:request:progress:chunk'))
      controller.enqueue(value)
    }
  })

  return {
    stream,
    firstChunk
  }
}
