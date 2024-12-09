/* eslint-disable @typescript-eslint/no-unused-vars */
import { type ComponentLogger } from '@libp2p/interface'
import { type ReadableStorage, exporter, type ExporterOptions } from 'ipfs-unixfs-exporter'
import first from 'it-first'
import toBrowserReadableStream from 'it-to-browser-readablestream'
import { type CID } from 'multiformats/cid'
import { type ContentTypeParser } from '../types.js'
import { getStreamFromAsyncIterable } from './get-stream-from-async-iterable.js'
import { setContentType } from './set-content-type.js'

export interface EnhancedDagTraversalOptions extends ExporterOptions {
  blockstore: ReadableStorage
  cidOrPath: string | CID
  response: Response
  logger: ComponentLogger
  path: string
  contentTypeParser?: ContentTypeParser
}

export interface EnhancedDagTraversalResponse {
  stream: ReadableStream<Uint8Array>
  firstChunk: Uint8Array
}

export async function enhancedDagTraversal ({ blockstore, signal, onProgress, cidOrPath, offset, length, path, logger, contentTypeParser, response }: EnhancedDagTraversalOptions): Promise<EnhancedDagTraversalResponse> {
  const log = logger.forComponent('helia:verified-fetch:enhanced-dag-traversal')
  let firstChunk: any
  // try {
  const singleBlockEntry = await exporter(cidOrPath, blockstore, {
    signal,
    onProgress,
    blockReadConcurrency: 1
  })

  const singleBlockIter = singleBlockEntry.content({
    signal,
    onProgress,
    offset,
    length
  })
  log.trace('got single concurrency iterator for %s', cidOrPath)

  firstChunk = await first(singleBlockIter)
  await setContentType({ bytes: firstChunk, path, response, contentTypeParser, log })

  const contentType = response.headers.get('content-type')

  // if video or image, return toBrowserReadableStream(asyncIter)
  if (contentType?.startsWith('video/') === true || contentType?.startsWith('image/') === true) {
    log('returning stream for image/video')
    return {
      // stream: toBrowserReadableStream(singleBlockIter),
      stream: (await getStreamFromAsyncIterable(singleBlockIter, path, logger, { signal })).stream,
      firstChunk
    }
  }
  // } catch (err: any) {
  //   // signal?.throwIfAborted()
  //   log.error('Unknown error', err)
  //   throw err
  // }

  // try {
  log.trace('getting iterator for non-image/video content')
  // otherwise, use blockReadConcurrency: undefined
  const entry = await exporter(cidOrPath, blockstore, {
    signal,
    onProgress
  })
  const iter = entry.content({
    signal,
    onProgress,
    offset,
    length
  })
  firstChunk ??= await first(iter)

  log('returning stream for non-image/video content')
  return {
    // stream: toBrowserReadableStream(iter),
    stream: (await getStreamFromAsyncIterable(iter, path, logger, { signal })).stream,
    firstChunk
  }
  // } catch (err: any) {
  //   // if aborted
  //   // signal?.throwIfAborted()
  //   log.error('Unknown error', err)
  //   throw err
  // }
}
