import { type ComponentLogger } from '@libp2p/interface'
import { type ReadableStorage, exporter, type ExporterOptions } from 'ipfs-unixfs-exporter'
import first from 'it-first'
import toBrowserReadableStream from 'it-to-browser-readablestream'
import { type CID } from 'multiformats/cid'
import { type ContentTypeParser } from '../types.js'
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

export async function enhancedDagTraversal ({
  blockstore,
  signal,
  onProgress,
  cidOrPath,
  offset,
  length,
  path,
  logger,
  contentTypeParser,
  response
}: EnhancedDagTraversalOptions): Promise<EnhancedDagTraversalResponse> {
  const log = logger.forComponent('helia:verified-fetch:enhanced-dag-traversal')

  // Fetch the first chunk eagerly
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

  let firstChunk
  let error: Error
  try {
    firstChunk = await first(dfsIter)
  } catch (err: any) {
    if (signal?.aborted === true) {
      error = err
      log.trace('Request aborted while fetching first chunk')
    } else {
      throw err
    }
  }

  // Determine content type based on the first chunk
  await setContentType({ bytes: firstChunk, path, response, contentTypeParser, log })

  const contentType = response.headers.get('content-type')
  const isImageOrVideo = contentType?.startsWith('video/') === true || contentType?.startsWith('image/') === true
  log.trace('Content type determined: %s', contentType)

  const enhancedIter = async function * (): AsyncGenerator<Uint8Array, void, undefined> {
    if (error != null) {
      throw error
    }
    if (isImageOrVideo) {
      yield * dfsIter
      return
    }

    // If not image/video, switch to a BFS iterator
    const bfsEntry = await exporter(cidOrPath, blockstore, {
      signal,
      onProgress
    })

    const bfsIter = bfsEntry.content({
      signal,
      onProgress,
      offset,
      length
    })

    // continue with the BFS iterator
    yield * bfsIter
  }

  const stream = toBrowserReadableStream(enhancedIter())

  return {
    stream,
    firstChunk
  }
}
