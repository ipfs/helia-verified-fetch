import { InvalidRangeError } from '../errors.ts'

interface OffsetLength<T = number> {
  offset: T
  length: T
}

function downCast ({ offset, length }: OffsetLength<bigint>): OffsetLength {
  return {
    offset: Number(offset),
    length: Number(length)
  }
}

/**
 * N.b. Range start (zero indexed, inclusive) and end (inclusive) - this is
 * different to `Uint8Array.subarray` which is end exclusive.
 */
export function rangeToOffsetAndLength (size: bigint | number, start?: number | bigint, end?: number | bigint): { offset: number, length: number } {
  size = BigInt(size)

  if (start != null) {
    start = BigInt(start)

    if (start < 0n) {
      throw new InvalidRangeError('Range start cannot be negative')
    }

    if (start >= size) {
      throw new InvalidRangeError('Range start cannot be larger than total bytes')
    }
  }

  if (end != null) {
    end = BigInt(end)

    const abs = end > 0n ? end : -end

    if (abs >= size) {
      throw new InvalidRangeError('Range end cannot be larger than total bytes')
    }

    if (end < 0n) {
      if (start == null) {
        start = size + end
        end = size - 1n
      } else {
        throw new InvalidRangeError('Range end cannot be negative')
      }
    }

    // make inclusive end exclusive
    end += 1n
  }

  return downCast(toOffsetAndLength(size, start, end))
}

/**
 * Translate `from:to` zero-indexed inclusive bytes to offset/length
 */
export function entityBytesToOffsetAndLength (size: number | bigint, entityBytes?: string | null): { offset: number, length: number } {
  size = BigInt(size)
  const parts = (entityBytes ?? '0:*').split(':')
  const start = BigInt(parts[0])
  const end = parts[1] === '*' ? size : BigInt(parts[1])

  return downCast(toOffsetAndLength(size, start, end))
}

/**
 * Translate `from:to` zero-indexed inclusive bytes to offset/length
 */
function toOffsetAndLength (size: bigint, start: bigint = 0n, end: bigint = size): { offset: bigint, length: bigint } {
  if (start >= 0n) {
    if (end >= 0n) {
      return {
        offset: start,
        length: end - start
      }
    } else {
      return {
        offset: start,
        length: (size - start) + end
      }
    }
  }

  // start < 0
  let offset = size + start

  if (Math.abs(Number(start)) > Number(size)) {
    offset = 0n
  }

  if (end >= 0n) {
    return {
      offset,
      length: end - offset
    }
  }

  // end < 0
  return {
    offset,
    length: (size - offset) + end
  }
}
