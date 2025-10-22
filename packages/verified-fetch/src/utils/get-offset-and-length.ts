import type { UnixFSEntry } from 'ipfs-unixfs-exporter'

export function getOffsetAndLength (entry: UnixFSEntry, entityBytes?: string): { offset: number, length: number } {
  if (entityBytes == null) {
    return {
      offset: 0,
      length: Infinity
    }
  }

  const parts = entityBytes.split(':')
  const start = parseInt(parts[0], 10)
  const end = parts[1] === '*' ? Infinity : parseInt(parts[1], 10)

  if (isNaN(start) || isNaN(end)) {
    throw new Error('Could not parse entity-bytes')
  }

  const entrySize = Number(entry.size)

  if (start >= 0) {
    if (end >= 0) {
      return {
        offset: start,
        length: end - start
      }
    } else {
      return {
        offset: start,
        length: (entrySize - start) + end
      }
    }
  }

  // start < 0
  let offset = entrySize + start

  if (Math.abs(start) > entrySize) {
    offset = 0
  }

  if (end >= 0) {
    return {
      offset,
      length: (entrySize - offset) + end
    }
  }

  // end < 0
  return {
    offset,
    length: (entrySize - offset) + end
  }
}
