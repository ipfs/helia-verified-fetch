import type { ComponentLogger } from '@libp2p/logger'

/**
 * Given a stream and a byte range, returns a new stream that only contains the requested range
 */
export function splicingTransformStream (originalStream: ReadableStream<Uint8Array>, offset: number | undefined, length: number | undefined, logger: ComponentLogger): ReadableStream<Uint8Array> {
  const log = logger.forComponent('helia:splicing-transform-stream')
  log.trace('splicingTransformStream: offset=%O, length=%O', offset, length)
  // default is noop
  let transform: TransformerTransformCallback<Uint8Array, Uint8Array> = async () => {}
  let flush: TransformerFlushCallback<Uint8Array> | undefined
  const offsetOnlyUseCase = offset != null && length == null // read from the offset to the end of the stream
  const lengthOnlyUseCase = offset == null && length != null // only enqueue the last <length> bytes of the stream
  const offsetAndLengthUseCase = offset != null && length != null // read <length> bytes from the offset
  log.trace('splicingTransformStream: offsetOnlyUseCase=%O, lengthOnlyUseCase=%O, offsetAndLengthUseCase=%O', offsetOnlyUseCase, lengthOnlyUseCase, offsetAndLengthUseCase)

  if (lengthOnlyUseCase) {
    const bufferSize = length // The size of the buffer to keep the last 'length' bytes
    const buffer = new Uint8Array(bufferSize) // Initialize the buffer
    let bufferFillSize = 0 // Track how much of the buffer is currently used

    transform = async (chunk, controller) => {
      if (chunk.byteLength >= bufferSize) {
        // If the chunk is larger than the entire buffer, just take the last 'bufferSize' bytes
        buffer.set(chunk.slice(-bufferSize), 0)
        bufferFillSize = bufferSize // The buffer is now fully filled
      } else {
        if (chunk.byteLength + bufferFillSize <= bufferSize) {
          // If the chunk fits in the remaining space in the buffer, just add it at the end
          buffer.set(chunk, bufferFillSize)
          bufferFillSize += chunk.byteLength
        } else {
          // We need to shift existing data and add the new chunk at the end
          const bytesToShift = bufferFillSize + chunk.byteLength - bufferSize

          // Shift existing data to the left by bytesToShift
          buffer.copyWithin(0, bytesToShift)

          // Set the new chunk in the freed space, ensuring we don't exceed the buffer bounds
          const newChunkStartIndex = Math.max(bufferFillSize - bytesToShift, 0)
          buffer.set(chunk, newChunkStartIndex)

          bufferFillSize = Math.min(bufferFillSize + chunk.byteLength, bufferSize) // Ensure bufferFillSize doesn't exceed bufferSize
        }
      }
    }
    flush = async (controller) => {
      if (bufferFillSize > 0) {
        // Enqueue only the filled part of the buffer
        controller.enqueue(buffer.slice(0, bufferFillSize))
      }
    }
  } else if (offsetAndLengthUseCase) {
    let currentOffset = offset // Initialize with the given offset
    let remainingLength = length // Track the remaining length to process

    transform = async (chunk, controller) => {
      if (currentOffset >= chunk.byteLength) {
        // Entire chunk is before the offset, skip it
        currentOffset -= chunk.byteLength
      } else if (remainingLength > 0) {
        // Process chunk starting from the offset, considering the remaining length
        const start = currentOffset
        const end = Math.min(chunk.byteLength, start + remainingLength)
        const processedChunk = chunk.slice(start, end)
        controller.enqueue(processedChunk)

        // Update remaining length and reset currentOffset after first chunk
        remainingLength -= processedChunk.byteLength
        currentOffset = 0

        if (remainingLength <= 0) {
          // All required bytes processed, terminate the stream
          controller.terminate()
        }
      }
    }
  } else if (offsetOnlyUseCase) {
    // only offset provided
    let currentOffset = offset
    transform = async (chunk, controller) => {
      if (currentOffset >= chunk.byteLength) {
        // Entire chunk is before the offset, skip it
        currentOffset -= chunk.byteLength
      } else {
        // Process chunk starting from the offset
        const start = currentOffset
        const processedChunk = chunk.slice(start)
        controller.enqueue(processedChunk)

        // Reset currentOffset after first chunk
        currentOffset = 0
      }
    }
  } else {
    // noop
  }
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>({
    transform,
    flush
  })

  void originalStream.pipeTo(writable).catch((err): void => {
    if (err.message.includes('TransformStream') === true) {
      // calling .terminate() on the controller will cause the transform stream to throw an error
      return
    }
    log.error('Error piping original stream to splicing transform stream', err)
  })
  return readable
}
