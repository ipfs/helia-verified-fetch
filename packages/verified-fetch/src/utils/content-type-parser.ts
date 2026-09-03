import { fileTypeFromBuffer } from 'file-type'

export const defaultMimeType = 'application/octet-stream'
function checkForSvg (text: string): boolean {
  return /^(<\?xml[^>]+>)?[^<^\w]+<svg/ig.test(text)
}

async function checkForJson (text: string): Promise<boolean> {
  try {
    JSON.parse(text)
    return true
  } catch (err) {
    return false
  }
}

function getText (bytes: Uint8Array): string | null {
  const decoder = new TextDecoder('utf-8', { fatal: true })

  try {
    return decoder.decode(bytes)
  } catch (err) {
    return null
  }
}

async function checkForHtml (text: string): Promise<boolean> {
  return /^\s*<(?:!doctype\s+html|html|head|body)\b/i.test(text)
}

export async function contentTypeParser (bytes: Uint8Array, fileName?: string): Promise<string> {
  const detectedType = (await fileTypeFromBuffer(bytes))?.mime

  if (detectedType != null) {
    if (detectedType === 'application/xml' && fileName?.toLowerCase().endsWith('.svg')) {
      return 'image/svg+xml'
    }

    return detectedType
  }

  // no filename or filename has no extension
  if (fileName == null || fileName.includes('.') === false) {
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

  // formats file-type cannot sniff at all, plus the media containers it only
  // recognises when their magic bytes start at offset 0 - a file with leading
  // padding (an MP3 whose first frame sync sits behind a run of silence, a PDF
  // that does not begin with its header) reaches this switch as well, and
  // `application/octet-stream` makes the browser download it instead of
  // playing or displaying it inline
  // @see https://github.com/sindresorhus/file-type#supported-file-types
  // @see https://github.com/ipfs/service-worker-gateway/issues/1197
  switch (fileName.split('.').pop()?.toLowerCase()) {
    case 'css':
      return 'text/css'
    case 'html':
      return 'text/html; charset=utf-8'
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'text/javascript'
    case 'json':
      return 'application/json'
    case 'txt':
      return 'text/plain'
    case 'md':
    case 'markdown':
      return 'text/markdown'
    case 'xml':
      return 'text/xml; charset=utf-8'
    case 'csv':
      return 'text/csv'
    case 'vtt':
      return 'text/vtt'
    case 'woff2':
      return 'font/woff2'
    // see bottom of https://github.com/sindresorhus/file-type#supported-file-types
    case 'svg':
      return 'image/svg+xml'
    case 'ico':
      return 'image/x-icon'
    case 'pdf':
      return 'application/pdf'
    case 'aac':
      return 'audio/aac'
    case 'flac':
      return 'audio/flac'
    case 'm4a':
      return 'audio/mp4'
    case 'mid':
    case 'midi':
      return 'audio/midi'
    case 'mp3':
      return 'audio/mpeg'
    case 'oga':
    case 'ogg':
    case 'opus':
      return 'audio/ogg'
    case 'wav':
      return 'audio/wav'
    case 'weba':
      return 'audio/webm'
    case 'avi':
      return 'video/x-msvideo'
    case 'm4v':
    case 'mp4':
      return 'video/mp4'
    case 'mkv':
      return 'video/x-matroska'
    case 'mov':
      return 'video/quicktime'
    case 'ogv':
      return 'video/ogg'
    case 'webm':
      return 'video/webm'
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
