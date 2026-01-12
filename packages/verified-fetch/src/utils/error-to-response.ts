import { badGatewayResponse, gatewayTimeoutResponse, internalServerErrorResponse, notFoundResponse, preconditionFailedResponse } from './responses.js'
import type { Resource } from '../index.js'

export function errorToResponse (resource: Resource | string, err: any, init?: RequestInit): Response {
  // throw an AbortError if the passed signal has aborted
  init?.signal?.throwIfAborted()

  // rethrow these errors
  if (['AbortError', 'InvalidParametersError'].includes(err.name)) {
    throw err
  }

  // could not reach an upstream server, bad connection or offline
  if (err.code === 'ECONNREFUSED' || err.code === 'ECANCELLED' || err.name === 'DNSQueryFailedError') {
    return gatewayTimeoutResponse(resource, err)
  }

  // data was not parseable, user may be able to request raw block
  if (['NotUnixFSError'].includes(err.name)) {
    return badGatewayResponse(resource, err)
  }

  // an upstream server didn't respond in time but inside the signal timeout
  if (err.code === 'ETIMEOUT' || err.name === 'TimeoutError') {
    return gatewayTimeoutResponse(resource, err)
  }

  // path was not under DAG root
  if (['ERR_BAD_PATH', 'ERR_NO_TERMINAL_ELEMENT', 'ERR_NOT_FOUND'].includes(err.code)) {
    return notFoundResponse(resource)
  }

  // path was not under DAG root
  if (['DoesNotExistError'].includes(err.name)) {
    return notFoundResponse(resource)
  }

  if (['BlockNotFoundWhileOfflineError'].includes(err.name)) {
    return preconditionFailedResponse(resource)
  }

  if (['RecordNotFoundError', 'LoadBlockFailedError'].includes(err.name)) {
    return gatewayTimeoutResponse(resource, err)
  }

  // can't tell what went wrong, return a generic error
  return internalServerErrorResponse(resource, err)
}
