import { badGatewayResponse, gatewayTimeoutResponse, internalServerErrorResponse, notFoundResponse, preconditionFailedResponse } from './responses.js'
import type { Resource } from '../index.js'

export function errorToResponse (resource: Resource | string, err: any): Response {
  // if a signal abort caused the error, throw the error
  if (err.name === 'AbortError') {
    throw err
  }

  // could not reach an upstream server, bad connection or offline
  if (err.code === 'ECONNREFUSED' || err.code === 'ECANCELLED' || err.name === 'DNSQueryFailedError') {
    return gatewayTimeoutResponse(resource.toString(), err)
  }

  // data was not parseable, user may be able to request raw block
  if (['NotUnixFSError'].includes(err.name)) {
    return badGatewayResponse(resource.toString(), err)
  }

  // an upstream server didn't respond in time but inside the signal timeout
  if (err.code === 'ETIMEOUT' || err.name === 'TimeoutError') {
    return gatewayTimeoutResponse(resource.toString(), err)
  }

  // path was not under DAG root
  if (['ERR_NO_PROP', 'ERR_NO_TERMINAL_ELEMENT', 'ERR_NOT_FOUND'].includes(err.code)) {
    return notFoundResponse(resource.toString())
  }

  // path was not under DAG root
  if (['DoesNotExistError'].includes(err.name)) {
    return notFoundResponse(resource.toString())
  }

  if (['BlockNotFoundWhileOfflineError'].includes(err.name)) {
    return preconditionFailedResponse(resource.toString())
  }

  if (['RecordNotFoundError', 'LoadBlockFailedError'].includes(err.name)) {
    return gatewayTimeoutResponse(resource.toString(), err)
  }

  // can't tell what went wrong, return a generic error
  return internalServerErrorResponse(resource.toString(), err)
}
