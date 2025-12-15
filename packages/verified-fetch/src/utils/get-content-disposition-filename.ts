import { InvalidParametersError } from '@libp2p/interface'

/**
 * Takes a filename URL param and returns a string for use in a
 * `Content-Disposition` header
 */
export function getContentDispositionFilename (filename: string | null): string {
  if (filename == null) {
    throw new InvalidParametersError('Cannot get filename for Content-Disposition header - filename argument was missing')
  }

  const asciiOnly = replaceNonAsciiCharacters(filename)

  if (asciiOnly === filename) {
    return `filename="${filename}"`
  }

  return `filename="${asciiOnly}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

function replaceNonAsciiCharacters (filename: string): string {
  // eslint-disable-next-line no-control-regex
  return filename.replace(/[^\x00-\x7F]/g, '_')
}
