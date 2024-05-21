import { type AbortOptions, type ComponentLogger } from '@libp2p/interface'
import { type VerifiedFetchInit, type Resource } from '../index.js'
import { matchURLString } from './parse-url-string.js'
import { movedPermanentlyResponse } from './responses.js'

interface GetRedirectResponse {
  resource: Resource
  options?: Omit<VerifiedFetchInit, 'signal'> & AbortOptions
  logger: ComponentLogger

}

export async function getRedirectResponse ({ resource, options, logger }: GetRedirectResponse): Promise<null | Response> {
  const log = logger.forComponent('helia:verified-fetch:get-redirect-response')
  if (typeof resource !== 'string' || options == null) {
    return null
  }
  log.trace('checking for redirect info')
  // if x-forwarded-host is passed, we need to set the location header to the subdomain
  // so that the browser can redirect to the correct subdomain
  try {
    // TODO: handle checking if subdomains are enabled and set location to subdomain host instead.
    const headers = new Headers(options?.headers)
    // if (headers.get('x-forwarded-host') != null) {
    const urlParts = matchURLString(resource)
    const reqUrl = new URL(resource)
    const actualHost = headers.get('x-forwarded-host') ?? reqUrl.host
    // const subdomainUrl = new URL(reqUrl, `${reqUrl.protocol}//${urlParts.cidOrPeerIdOrDnsLink}.${urlParts.protocol}.${actualHost}`)
    const subdomainUrl = new URL(reqUrl)
    subdomainUrl.host = `${urlParts.cidOrPeerIdOrDnsLink}.${urlParts.protocol}.${actualHost}`

    log.trace('headers.get(\'host\')=%s', headers.get('host'))
    log.trace('headers.get(\'x-forwarded-host\')=%s', headers.get('x-forwarded-host'))
    log.trace('headers.get(\'x-forwarded-for\')=%s', headers.get('x-forwarded-for'))
    if (headers.get('host') != null && headers.get('host') === reqUrl.host) {
      // log.trace('host header is the same as the request url host, not setting location header')
      log.trace('host header is the same as the request url host')
      // return null
    } else {
      log.trace('host header is different from the request url host')
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
