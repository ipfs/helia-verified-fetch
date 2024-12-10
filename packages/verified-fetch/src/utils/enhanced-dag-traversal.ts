import { type ComponentLogger } from '@libp2p/interface'
import { type ReadableStorage, exporter, type ExporterOptions } from 'ipfs-unixfs-exporter'
import first from 'it-first'
// import peekable from 'it-peekable'
import toBrowserReadableStream from 'it-to-browser-readablestream'
import { type CID } from 'multiformats/cid'
import { type ContentTypeParser } from '../types.js'
import { getContentType } from './get-content-type.js'

export interface EnhancedDagTraversalOptions extends ExporterOptions {
  blockstore: ReadableStorage
  cidOrPath: string | CID
  logger: ComponentLogger
  path: string
  contentTypeParser?: ContentTypeParser
}

export interface EnhancedDagTraversalResponse {
  stream: ReadableStream<Uint8Array>
  firstChunk: Uint8Array
}

export async function enhancedDagTraversal ({
  blockstore,
  signal,
  onProgress,
  cidOrPath,
  offset,
  length,
  path,
  logger,
  contentTypeParser
}: EnhancedDagTraversalOptions): Promise<EnhancedDagTraversalResponse> {
  const log = logger.forComponent('helia:verified-fetch:enhanced-dag-traversal')

  const dfsEntry = await exporter(cidOrPath, blockstore, {
    signal,
    onProgress,
    blockReadConcurrency: 1
  })

  const dfsIter = dfsEntry.content({
    signal,
    onProgress,
    offset,
    length
  })

  let firstChunk: Uint8Array = new Uint8Array()
  let error: Error
  try {
    // Fetch the first chunk eagerly
    firstChunk = await first(dfsIter)
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

        // Determine content type based on the first chunk
        const contentType = await getContentType({ bytes: firstChunk, contentTypeParser, path, log })

        const isImageOrVideo = contentType.startsWith('video/') || contentType.startsWith('image/')
        log.trace('Content type determined: %s', contentType)

        const exporterEntry = isImageOrVideo
          ? dfsEntry
        // If not image/video, switch to a BFS iterator
          : await exporter(cidOrPath, blockstore, {
            signal,
            onProgress
          })

        // continue with the BFS iterator
        for await (const chunk of exporterEntry.content({
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
