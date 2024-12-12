import { type ComponentLogger } from '@libp2p/interface'
import { type ExporterOptions, type UnixFSEntry } from 'ipfs-unixfs-exporter'
import peekable from 'it-peekable'
import toBrowserReadableStream from 'it-to-browser-readablestream'

export interface EnhancedDagTraversalOptions extends ExporterOptions {
  logger: ComponentLogger
  entry: UnixFSEntry
}

export interface EnhancedDagTraversalResponse {
  stream: ReadableStream<Uint8Array>
  firstChunk: Uint8Array
}

export async function enhancedDagTraversal ({
  signal,
  onProgress,
  offset,
  length,
  logger,
  entry
}: EnhancedDagTraversalOptions): Promise<EnhancedDagTraversalResponse> {
  const log = logger.forComponent('helia:verified-fetch:enhanced-dag-traversal')

  const peekableIter = peekable(entry.content({
    signal,
    onProgress,
    offset,
    length,
    blockReadConcurrency: 1
  }))

  let firstChunk: Uint8Array = new Uint8Array()
  let error: Error
  try {
    // Fetch the first chunk eagerly to determine the content type
    const firstPeek = await peekableIter.peek()
    if (firstPeek.done === true) {
      throw new Error('No content found')
    }
    firstChunk = firstPeek.value
    peekableIter.push(firstChunk)
  } catch (err: any) {
    if (signal?.aborted === true) {
      error = err
      log.trace('Request aborted while fetching first chunk')
    } else {
      throw err
    }
  }

  return {
    stream: toBrowserReadableStream({
      [Symbol.asyncIterator]: async function * (): AsyncGenerator<Uint8Array, void, undefined> {
        if (error != null) {
          throw error
        }

        for await (const chunk of entry.content({
          signal,
          onProgress,
          offset,
          length
        })) {
          yield chunk
        }
      }
    }),
    firstChunk
  }
}
