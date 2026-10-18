import { fileTypeFromBuffer } from 'file-type'

export const defaultMimeType = 'application/octet-stream'
// skip a prolog of whitespace, `<?…?>`, `<!-- … -->` and `<!DOCTYPE …>`, then
// require `<svg` as the first tag. Each alternative starts differently and
// can't run past its terminator, so the match stays linear
function checkForSvg (text: string): boolean {
  return /^(?:\s|<\?(?:[^?]|\?(?!>))*\?>|<!--(?:[^-]|-(?!->))*-->|<!doctype[^>]*>)*<svg[\s/>]/i.test(text)
}

// a JSON object or array that is valid up to the end of the text, so a sample
// cut off mid-document still matches. Scalars are rejected on purpose
// @see https://github.com/gabriel-vasile/mimetype/issues/175
function checkForJson (text: string): boolean {
  let i = text.search(/[^ \t\n\r]/)

  if (text[i] !== '{' && text[i] !== '[') {
    return false
  }

  const closers: string[] = []
  let state: 'value' | 'key' | 'colon' | 'after' = 'value'
  let canClose = false

  while (i < text.length) {
    const c = text[i]

    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++
    } else if (c === closers[closers.length - 1] && (state === 'after' || canClose)) {
      closers.pop()
      state = 'after'
      canClose = false
      i++
    } else if (state === 'after') {
      if (c !== ',' || closers.length === 0) {
        return false
      }

      state = closers[closers.length - 1] === '}' ? 'key' : 'value'
      i++
    } else if (state === 'colon') {
      if (c !== ':') {
        return false
      }

      state = 'value'
      i++
    } else if (c === '"') {
      i = skipString(text, i)

      if (i < 0) {
        return false
      }

      state = state === 'key' ? 'colon' : 'after'
      canClose = false
    } else if (state === 'key') {
      return false
    } else if (c === '{' || c === '[') {
      closers.push(c === '{' ? '}' : ']')
      state = c === '{' ? 'key' : 'value'
      canClose = true
      i++
    } else {
      // a number or literal, which may be cut off by the end of the text
      JSON_TOKEN.lastIndex = i
      JSON_TOKEN.test(text)
      const end = JSON_TOKEN.lastIndex
      const token = text.slice(i, end)
      const valid = end === text.length
        ? JSON_LITERALS.some(literal => literal.startsWith(token)) || JSON_NUMBER.test(token) || JSON_NUMBER.test(`${token}0`)
        : JSON_LITERALS.includes(token) || JSON_NUMBER.test(token)

      if (!valid) {
        return false
      }

      state = 'after'
      canClose = false
      i = end
    }
  }

  return true
}

// sticky, so it matches the token starting at `lastIndex` and nothing later
const JSON_TOKEN = /[\w+\-.]*/y
const JSON_LITERALS = ['true', 'false', 'null']
const JSON_NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/

// returns the index after the closing quote, `text.length` if the string is
// cut off, or -1 if it is invalid
function skipString (text: string, i: number): number {
  for (i++; i < text.length; i++) {
    const c = text[i]

    if (c === '"') {
      return i + 1
    }

    if (c === '\\') {
      i++

      if (text[i] === 'u') {
        if (!/^[0-9a-fA-F]*$/.test(text.slice(i + 1, i + 5))) {
          return -1
        }

        i += 4
      } else if (i < text.length && !'"\\/bfnrt'.includes(text[i])) {
        return -1
      }
    } else if (c < ' ') {
      return -1
    }
  }

  return text.length
}

function getText (bytes: Uint8Array): string | null {
  const decoder = new TextDecoder('utf-8', { fatal: true })

  try {
    return decoder.decode(bytes)
  } catch (err) {
    return null
  }
}

// the scriptable signatures of the WHATWG "rules for identifying an unknown
// MIME type", each followed by a space or `>`
// @see https://mimesniff.spec.whatwg.org/#identifying-a-resource-with-an-unknown-mime-type
async function checkForHtml (text: string): Promise<boolean> {
  return /^[\t\n\f\r ]*<(?:!doctype html|html|head|script|iframe|h1|div|font|table|a|style|title|b|body|br|p|!--)[ >]/i.test(text)
}

export async function contentTypeParser (bytes: Uint8Array, fileName?: string): Promise<string> {
  const detectedType = (await fileTypeFromBuffer(bytes))?.mime

  if (detectedType != null) {
    if (detectedType === 'application/xml' && (fileName?.toLowerCase().endsWith('.svg') === true || checkForSvg(getText(bytes) ?? ''))) {
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
      } else if (checkForJson(text)) {
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
  // recognizes when their magic bytes start at offset 0 - a file with leading
  // padding (an MP3 whose first frame sync sits behind a run of silence, a PDF
  // that does not begin with its header) reaches this switch as well, and
  // `application/octet-stream` makes the browser download it instead of
  // playing or displaying it inline
  // @see https://github.com/sindresorhus/file-type#supported-file-types
  // @see https://github.com/ipfs/service-worker-gateway/issues/1197
  switch (fileName.split('.').pop()?.toLowerCase()) {
    case 'css':
      return 'text/css'
    case 'htm':
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
