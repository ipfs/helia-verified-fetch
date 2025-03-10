import { logger } from '@libp2p/logger'
import { fileTypeFromBuffer } from 'file-type'

const log = logger('helia:verified-fetch:content-type-parser')

export const defaultMimeType = 'application/octet-stream'
function checkForSvg (bytes: Uint8Array): boolean {
  log('checking for svg')
  return /^(<\?xml[^>]+>)?[^<^\w]+<svg/ig.test(new TextDecoder().decode(bytes.slice(0, 64)))
}

async function checkForJson (bytes: Uint8Array): Promise<boolean> {
  log('checking for json')
  try {
    JSON.parse(new TextDecoder().decode(bytes))
    return true
  } catch (err) {
    log('failed to parse as json', err)
    return false
  }
}

export async function contentTypeParser (bytes: Uint8Array, fileName?: string): Promise<string> {
  log('contentTypeParser called for fileName: %s, byte size=%s', fileName, bytes.length)
  const detectedType = (await fileTypeFromBuffer(bytes))?.mime
  if (detectedType != null) {
    log('detectedType: %s', detectedType)
    return detectedType
  }
  log('no detectedType')

  if (fileName == null) {
    // no other way to determine file-type.
    if (checkForSvg(bytes)) {
      return 'image/svg+xml'
    } else if (await checkForJson(bytes)) {
      return 'application/json'
    }
    return defaultMimeType
  }

  // no need to include file-types listed at https://github.com/SgtPooki/file-type#supported-file-types
  switch (fileName.split('.').pop()) {
    case 'css':
      return 'text/css'
    case 'html':
      return 'text/html; charset=utf-8'
    case 'js':
      return 'application/javascript'
    case 'json':
      return 'application/json'
    case 'txt':
      return 'text/plain'
    case 'woff2':
      return 'font/woff2'
    // see bottom of https://github.com/SgtPooki/file-type#supported-file-types
    case 'svg':
      return 'image/svg+xml'
    case 'csv':
      return 'text/csv'
    case 'doc':
      return 'application/msword'
    case 'xls':
      return 'application/vnd.ms-excel'
    case 'ppt':
      return 'application/vnd.ms-powerpoint'
    case 'msi':
      return 'application/x-msdownload'
    default:
      return defaultMimeType
  }
}
