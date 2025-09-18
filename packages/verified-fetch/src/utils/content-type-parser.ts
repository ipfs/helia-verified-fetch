import { logger } from '@libp2p/logger'
import { fileTypeFromBuffer } from 'file-type'

const log = logger('helia:verified-fetch:content-type-parser')

export const defaultMimeType = 'application/octet-stream'
function checkForSvg (text: string): boolean {
  log('checking for svg')
  return /^(<\?xml[^>]+>)?[^<^\w]+<svg/ig.test(text)
}

async function checkForJson (text: string): Promise<boolean> {
  log('checking for json')
  try {
    JSON.parse(text)
    return true
  } catch (err) {
    log('failed to parse as json', err)
    return false
  }
}

function getText (bytes: Uint8Array): string | null {
  log('checking for text')
  const decoder = new TextDecoder('utf-8', { fatal: true })
  try {
    return decoder.decode(bytes)
  } catch (err) {
    return null
  }
}

async function checkForHtml (text: string): Promise<boolean> {
  log('checking for html')
  return /^\s*<(?:!doctype\s+html|html|head|body)\b/i.test(text)
}

export async function contentTypeParser (bytes: Uint8Array, fileName?: string): Promise<string> {
  log('contentTypeParser called for fileName: %s, byte size=%s', fileName, bytes.length)
  const detectedType = (await fileTypeFromBuffer(bytes))?.mime
  if (detectedType != null) {
    log('detectedType: %s', detectedType)
    if (detectedType === 'application/xml' && fileName?.toLowerCase().endsWith('.svg')) {
      return 'image/svg+xml'
    }
    return detectedType
  }
  log('no detectedType')

  if (fileName == null) {
    // it's likely text... no other way to determine file-type.
    const text = getText(bytes)
    if (text != null) {
      // check for svg, json, html, or it's plain text.
      if (checkForSvg(text)) {
        return 'image/svg+xml'
      } else if (await checkForJson(text)) {
        return 'application/json'
      } else if (await checkForHtml(text)) {
        return 'text/html; charset=utf-8'
      } else {
        return 'text/plain; charset=utf-8'
      }
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
