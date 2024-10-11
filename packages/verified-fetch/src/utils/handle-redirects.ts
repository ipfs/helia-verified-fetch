import { type AbortOptions, type ComponentLogger } from '@libp2p/interface'
import { SubdomainNotSupportedError } from '../errors.js'
import { type VerifiedFetchInit, type Resource } from '../index.js'
import { matchURLString } from './parse-url-string.js'
import { movedPermanentlyResponse } from './responses.js'
import type { CID } from 'multiformats/cid'

interface GetRedirectResponse {
  cid: CID
  resource: Resource
  options?: Omit<VerifiedFetchInit, 'signal'> & AbortOptions
  logger: ComponentLogger

  /**
   * Only used in testing.
   */
  fetch?: typeof globalThis.fetch
}

function maybeAddTraillingSlash (path: string): string {
  // if it has an extension-like ending, don't add a trailing slash
  if (path.match(/\.[a-zA-Z0-9]{1,4}$/) != null) {
    return path
  }
  return path.endsWith('/') ? path : `${path}/`
}

// See https://specs.ipfs.tech/http-gateways/path-gateway/#location-response-header
export async function getRedirectResponse ({ resource, options, logger, cid, fetch = globalThis.fetch }: GetRedirectResponse): Promise<null | Response> {
  const log = logger.forComponent('helia:verified-fetch:get-redirect-response')

  if (typeof resource !== 'string' || options == null || ['ipfs://', 'ipns://'].some((prefix) => resource.startsWith(prefix))) {
    return null
  }

  const headers = new Headers(options?.headers)
  const forwardedHost = headers.get('x-forwarded-host')
  const headerHost = headers.get('host')
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor == null && forwardedHost == null && headerHost == null) {
    log.trace('no redirect info found in headers')
    return null
  }

  log.trace('checking for redirect info')
  // if x-forwarded-host is passed, we need to set the location header to the subdomain
  // so that the browser can redirect to the correct subdomain
  try {
    const urlParts = matchURLString(resource)
    const reqUrl = new URL(resource)
    const actualHost = forwardedHost ?? reqUrl.host
    const subdomainUrl = new URL(reqUrl)
    if (urlParts.protocol === 'ipfs' && cid.version === 0) {
      subdomainUrl.host = `${cid.toV1()}.ipfs.${actualHost}`
    } else {
      subdomainUrl.host = `${urlParts.cidOrPeerIdOrDnsLink}.${urlParts.protocol}.${actualHost}`
    }

    if (headerHost?.includes(urlParts.protocol) === true && subdomainUrl.host.includes(headerHost)) {
      log.trace('request was for a subdomain already, not setting location header')
      return null
    }

    if (headerHost != null && !subdomainUrl.host.includes(headerHost)) {
      log.trace('host header is not the same as the subdomain url host, not setting location header')
      return null
    }
    if (reqUrl.host === subdomainUrl.host) {
      log.trace('req url is the same as the subdomain url, not setting location header')
      return null
    }

    subdomainUrl.pathname = maybeAddTraillingSlash(reqUrl.pathname.replace(`/${urlParts.cidOrPeerIdOrDnsLink}`, '').replace(`/${urlParts.protocol}`, ''))
    log.trace('subdomain url %s', subdomainUrl.href)
    const pathUrl = new URL(reqUrl, `${reqUrl.protocol}//${actualHost}`)
    pathUrl.pathname = maybeAddTraillingSlash(reqUrl.pathname)
    log.trace('path url %s', pathUrl.href)
    // try to query subdomain with HEAD request to see if it's supported
    try {
      const subdomainTest = await fetch(subdomainUrl, { method: 'HEAD' })
      if (subdomainTest.ok) {
        log('subdomain supported, redirecting to subdomain')
        return movedPermanentlyResponse(resource.toString(), subdomainUrl.href)
      } else {
        log('subdomain not supported, subdomain failed with status %s %s', subdomainTest.status, subdomainTest.statusText)
        throw new SubdomainNotSupportedError('subdomain not supported')
      }
    } catch (err: any) {
      log('subdomain not supported', err)
      if (pathUrl.href === reqUrl.href) {
        log('path url is the same as the request url, not setting location header')
        return null
      }
      // pathUrl is different from request URL (maybe even with just a trailing slash)
      return movedPermanentlyResponse(resource.toString(), pathUrl.href)
    }
  } catch (e) {
    // if it's not a full URL, we have nothing left to do.
    log.error('error setting location header for x-forwarded-host', e)
  }
  return null
}
