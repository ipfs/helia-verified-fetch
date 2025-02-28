import { type Logger } from '@libp2p/interface'
import { type ContentTypeParser } from '../types.js'
import { isPromise } from './type-guards.js'

export interface SetContentTypeOptions {
  bytes: Uint8Array
  path: string
  response: Response
  defaultContentType?: string
  contentTypeParser: ContentTypeParser | undefined
  log: Logger
}

export async function setContentType ({ bytes, path, response, contentTypeParser, log, defaultContentType = 'application/octet-stream' }: SetContentTypeOptions): Promise<void> {
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
  log.trace('setting content type to "%s"', contentType ?? defaultContentType)
  response.headers.set('content-type', contentType ?? defaultContentType)
}
