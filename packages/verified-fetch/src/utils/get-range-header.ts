import { InvalidRangeError } from '../errors.ts'
import { badRequestResponse, notSatisfiableResponse } from './responses.ts'
import type { Resource } from '../index.ts'

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Range
 */
export interface Range {
  /**
   * Where the range starts, zero indexed
   */
  start?: number

  /**
   * Where the range ends, inclusive
   */
  end?: number
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Range
 */
export interface RangeHeader {
  multipartBoundary: string
  ranges: Range[]
}

function parseValue (val?: string): number | undefined {
  if (val == null || val === '') {
    return
  }

  const num = Number(val)

  if (isNaN(num)) {
    throw new InvalidRangeError(`Invalid range specification: could not parse "${num}" as number`)
  }

  return num
}

function getByteRangeFromHeader (rangeHeader?: string): Range[] {
  if (rangeHeader == null || rangeHeader === '') {
    return []
  }

  /**
   * Range: bytes=<start>-<end> | bytes=<start2>- | bytes=-<end2> | bytes=<start1>-<end1>,<start2>-<end2>,...
   */
  if (!rangeHeader.startsWith('bytes=')) {
    throw new InvalidRangeError('Invalid range request')
  }

  const rangesStr = rangeHeader.substring(6) // Remove "bytes=" prefix
  const rangeParts = rangesStr.split(',').map(part => part.trim())
  const ranges: Range[] = []

  for (const part of rangeParts) {
    const match = part.match(/^(?<start>\d+)?-(?<end>\d+)?$/)

    if (match?.groups == null) {
      throw new InvalidRangeError(`Invalid range specification: ${part}`)
    }

    if (part.startsWith('-')) {
      ranges.push({
        end: parseValue(part)
      })
    } else {
      const { start, end } = match.groups

      ranges.push({
        start: parseValue(start),
        end: parseValue(end)
      })
    }
  }

  return ranges
}

export function getRangeHeader (resource: Resource, headers: Headers): RangeHeader | undefined | Response {
  const header = headers.get('range')

  // not a range request
  if (header == null) {
    return
  }

  try {
    const ranges = getByteRangeFromHeader(header)

    if (ranges.length === 0) {
      return
    }

    return {
      multipartBoundary: `multipart_byteranges_${Math.floor(Math.random() * 1_000_000_000)}`,
      ranges
    }
  } catch (e: any) {
    if (e.name === 'InvalidRangeError') {
      return notSatisfiableResponse(resource)
    }

    return badRequestResponse(resource, e)
  }
}
