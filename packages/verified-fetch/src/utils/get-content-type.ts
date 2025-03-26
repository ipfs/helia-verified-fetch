import { type Logger } from '@libp2p/interface'
import { type ContentTypeParser } from '../types.js'
import { defaultMimeType } from './content-type-parser.js'
import { isPromise } from './type-guards.js'

export interface GetContentTypeOptions {
  bytes: Uint8Array
  path: string
  defaultContentType?: string
  contentTypeParser: ContentTypeParser | undefined
  log: Logger
}

export async function getContentType ({ bytes, path, contentTypeParser, log, defaultContentType = 'application/octet-stream' }: GetContentTypeOptions): Promise<string> {
  let contentType: string | undefined

  if (contentTypeParser != null) {
    try {
      let fileName = path.split('/').pop()?.trim()
      fileName = fileName === '' ? undefined : fileName
      const parsed = contentTypeParser(bytes, fileName)

      if (isPromise(parsed)) {
        const result = await parsed

        if (result != null) {
          contentType = result
        }
      } else if (parsed != null) {
        contentType = parsed
      }
      log.trace('contentTypeParser returned %s', contentType)
    } catch (err) {
      log.error('error parsing content type', err)
    }
  }
  if (contentType === defaultMimeType) {
    // if the content type is the default in our content-type-parser, instead, set it to the default content type provided to this function.
    contentType = defaultContentType
  }

  return contentType ?? defaultContentType
}
