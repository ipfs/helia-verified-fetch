import { FORMAT_TO_MIME_TYPE } from './select-output-type.js'
import type { ParsedUrlStringResults } from './parse-url-string.js'

export interface IsAcceptExplicitOptions {

  query?: ParsedUrlStringResults['query']
  headers: Headers
}

export function isExplicitAcceptHeader (headers: Headers): boolean {
  const incomingAcceptHeader = headers.get('accept')
  if (incomingAcceptHeader != null && Object.values(FORMAT_TO_MIME_TYPE).includes(incomingAcceptHeader)) {
    return true
  }
  return false
}

export function isExplicitFormatQuery (query?: ParsedUrlStringResults['query']): boolean {
  const formatQuery = query?.format
  if (formatQuery != null && Object.keys(FORMAT_TO_MIME_TYPE).includes(formatQuery)) {
    return true
  }
  return false
}

/**
 * The user can provide an explicit `accept` header in the request headers or a `format` query parameter in the URL.
 * If either of these are provided, this function returns true.
 */
export function isExplicitIpldAcceptRequest ({ query, headers }: IsAcceptExplicitOptions): boolean {
  return isExplicitAcceptHeader(headers) || isExplicitFormatQuery(query)
}
