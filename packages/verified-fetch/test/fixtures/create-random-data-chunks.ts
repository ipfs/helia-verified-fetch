/**
 * Creates a Uint8Array filled with random data of the specified size
 *
 * @param sizeInBytes - The size of the array in bytes
 */
function createRandomData (sizeInBytes: number): Uint8Array {
  const data = new Uint8Array(sizeInBytes)
  const MAX_BYTES_PER_CALL = 65536 // see https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues#exceptions

  for (let offset = 0; offset < sizeInBytes; offset += MAX_BYTES_PER_CALL) {
    const chunkSize = Math.min(MAX_BYTES_PER_CALL, sizeInBytes - offset)
    const chunk = data.subarray(offset, offset + chunkSize)
    crypto.getRandomValues(chunk)
  }

  return data
}

/**
 * Creates multiple Uint8Arrays filled with random data and combines them.
 *
 * Useful for testing CIDs that reference larger content that spans multiple blocks.
 *
 * @param numberOfChunks - Number of chunks to create
 * @param sizeInBytes - Size of each chunk in bytes
 * @returns An object containing the individual chunks and the combined data
 */
export function createRandomDataChunks (numberOfChunks: number, sizeInBytes: number): {
  chunks: Uint8Array[]
  combined: Uint8Array
} {
  if (numberOfChunks * sizeInBytes <= 1024 * 1024) {
    throw new Error('NumberOfChunks * sizeInBytes must be greater than 1MB, otherwise, you don\'t need to use this function.')
  }

  const chunks = Array.from({ length: numberOfChunks }, () => createRandomData(sizeInBytes))
  const totalSize = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
  const combined = new Uint8Array(totalSize)

  let offset = 0
  for (const chunk of chunks) {
    combined.set(chunk, offset)
    offset += chunk.length
  }

  return { chunks, combined }
}
