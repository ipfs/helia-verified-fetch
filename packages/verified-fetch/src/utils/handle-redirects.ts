import { type AbortOptions, type ComponentLogger } from '@libp2p/interface'
import { type VerifiedFetchInit, type Resource } from '../index.js'
import { matchURLString } from './parse-url-string.js'
import { movedPermanentlyResponse } from './responses.js'
import type { CID } from 'multiformats/cid'

interface GetRedirectResponse {
  cid: CID
  resource: Resource
  options?: Omit<VerifiedFetchInit, 'signal'> & AbortOptions
  logger: ComponentLogger

}

export async function getRedirectResponse ({ resource, options, logger, cid }: GetRedirectResponse): Promise<null | Response> {
  const log = logger.forComponent('helia:verified-fetch:get-redirect-response')
  const headers = new Headers(options?.headers)
  if (typeof resource !== 'string' || options == null) {
    return null
  }
  log.trace('checking for redirect info')
  // if x-forwarded-host is passed, we need to set the location header to the subdomain
  // so that the browser can redirect to the correct subdomain
  try {
    // TODO: handle checking if subdomains are enabled and set location to subdomain host instead.
    // if (headers.get('x-forwarded-host') != null) {
    const urlParts = matchURLString(resource)
    const reqUrl = new URL(resource)
    const forwardedHost = headers.get('x-forwarded-host')
    const actualHost = forwardedHost ?? reqUrl.host
    // const subdomainUrl = new URL(reqUrl, `${reqUrl.protocol}//${urlParts.cidOrPeerIdOrDnsLink}.${urlParts.protocol}.${actualHost}`)
    const subdomainUrl = new URL(reqUrl)
    if (urlParts.protocol === 'ipfs' && cid.version === 0) {
      subdomainUrl.host = `${cid.toV1()}.ipfs.${actualHost}`
    } else {
      subdomainUrl.host = `${urlParts.cidOrPeerIdOrDnsLink}.${urlParts.protocol}.${actualHost}`
    }

    log.trace('headers.get(\'host\')=%s', headers.get('host'))
    log.trace('headers.get(\'x-forwarded-host\')=%s', headers.get('x-forwarded-host'))
    log.trace('headers.get(\'x-forwarded-for\')=%s', headers.get('x-forwarded-for'))
    const headerHost = headers.get('host')

    if (headerHost != null && !subdomainUrl.host.includes(headerHost)) {
      log.trace('host header is not the same as the subdomain url host, not setting location header')
      return null
    }
    if (reqUrl.host === subdomainUrl.host) {
      // log.trace('host header is the same as the request url host, not setting location header')
      log.trace('req url is the same as the subdomain url, not setting location header')
      return null
    } else {
      log.trace('req url is different from the subdomain url, attempting to set the location header')
    }

    subdomainUrl.pathname = reqUrl.pathname.replace(`/${urlParts.cidOrPeerIdOrDnsLink}`, '').replace(`/${urlParts.protocol}`, '')
    // log.trace('subdomain url %s, given input: %s', subdomainUrl.href, `${reqUrl.protocol}//${urlParts.cidOrPeerIdOrDnsLink}.${urlParts.protocol}.${actualHost}`)
    log.trace('subdomain url %s', subdomainUrl.href)
    const pathUrl = new URL(reqUrl, `${reqUrl.protocol}//${actualHost}`)
    log.trace('path url %s', pathUrl.href)
    // const url = new URL(reqUrl, `${reqUrl.protocol}//${actualHost}`)
    // try to query subdomain with HEAD request to see if it's supported
    try {
      const subdomainTest = await fetch(subdomainUrl, { method: 'HEAD' })
      if (subdomainTest.ok) {
        log('subdomain supported, redirecting to subdomain')
        return movedPermanentlyResponse(resource.toString(), subdomainUrl.href)
      }
    } catch (err: any) {
      log('subdomain not supported, redirecting to path', err)
      return movedPermanentlyResponse(resource.toString(), pathUrl.href)
    }
    // }
  } catch (e) {
    // if it's not a full URL, we have nothing left to do.
    log.error('error setting location header for x-forwarded-host', e)
  }
  return null
}
