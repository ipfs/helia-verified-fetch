import { type Logger } from '@libp2p/interface'
import { type ContentTypeParser } from '../types.js'
import { isPromise } from './type-guards.js'

export interface GetContentTypeOptions {
  bytes: Uint8Array
  path: string
  defaultContentType?: string
  contentTypeParser?: ContentTypeParser
  log: Logger
}

export async function getContentType ({ bytes, contentTypeParser, path, log, defaultContentType = 'application/octet-stream' }: GetContentTypeOptions): Promise<string> {
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
    } catch (err) {
      log.error('error parsing content type', err)
    }
  }
  return contentType ?? defaultContentType
}
