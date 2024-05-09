import { fileTypeFromBuffer } from '@sgtpooki/file-type'

// default from verified-fetch is application/octect-stream, which forces a download. This is not what we want for MANY file types.
const defaultMimeType = 'text/html; charset=utf-8'
function checkForSvg (bytes: Uint8Array): string {
  return /^(<\?xml[^>]+>)?[^<^\w]+<svg/ig.test(
    new TextDecoder().decode(bytes.slice(0, 64)))
    ? 'image/svg+xml'
    : defaultMimeType
}

export async function contentTypeParser (bytes: Uint8Array, fileName?: string): Promise<string> {
  const detectedType = (await fileTypeFromBuffer(bytes))?.mime
  if (detectedType != null) {
    return detectedType
  }

  if (fileName == null) {
    // no other way to determine file-type.
    return checkForSvg(bytes)
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
