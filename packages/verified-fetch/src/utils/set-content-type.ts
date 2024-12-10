import { type Logger } from '@libp2p/interface'
import { type ContentTypeParser } from '../types.js'
import { getContentType } from './get-content-type.js'

export interface SetContentTypeOptions {
  bytes: Uint8Array
  path: string
  response: Response
  defaultContentType?: string
  contentTypeParser?: ContentTypeParser
  log: Logger
}

export async function setContentType ({ bytes, path, response, contentTypeParser, log, defaultContentType = 'application/octet-stream' }: SetContentTypeOptions): Promise<void> {
  const contentType = await getContentType({ bytes, contentTypeParser, path, log, defaultContentType })
  log.trace('setting content type to "%s"', contentType ?? defaultContentType)
  response.headers.set('content-type', contentType ?? defaultContentType)
}
