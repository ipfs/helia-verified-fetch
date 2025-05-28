import { defaultMimeType } from './content-type-parser.js'
import { isPromise } from './type-guards.js'
import type { ContentTypeParser } from '../types.js'
import type { Logger } from '@libp2p/interface'

export interface SetContentTypeOptions {
  bytes: Uint8Array
  path: string
  response: Response
  defaultContentType?: string
  contentTypeParser: ContentTypeParser | undefined
  log: Logger

  /**
   * This should be set to the `filename` query parameter for the given request.
   *
   * @see https://specs.ipfs.tech/http-gateways/path-gateway/#filename-request-query-parameter
   */
  filename?: string
}

export async function setContentType ({ bytes, path, response, contentTypeParser, log, defaultContentType = 'application/octet-stream', filename: filenameParam }: SetContentTypeOptions): Promise<void> {
  let contentType: string | undefined

  if (contentTypeParser != null) {
    try {
      let fileName
      if (filenameParam == null) {
        fileName = path.split('/').pop()?.trim()
        fileName = (fileName === '' || fileName?.split('.').length === 1) ? undefined : fileName
      } else {
        fileName = filenameParam
      }
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
  log.trace('setting content type to "%s"', contentType ?? defaultContentType)
  response.headers.set('content-type', contentType ?? defaultContentType)
}
