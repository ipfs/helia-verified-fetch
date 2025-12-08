import { SubdomainNotSupportedError } from '../errors.js'
import { SUBDOMAIN_GATEWAY_REGEX } from './parse-url-string.js'
import { movedPermanentlyResponse } from './responses.js'
import type { VerifiedFetchInit, Resource } from '../index.js'
import type { AbortOptions, ComponentLogger } from '@libp2p/interface'
import type { CID } from 'multiformats/cid'

interface GetRedirectResponse {
  url: URL
  cid: CID
  resource: Resource
  options?: Omit<VerifiedFetchInit, 'signal'> & AbortOptions
  logger: ComponentLogger

  /**
   * Only used in testing
   */
  fetch?: typeof globalThis.fetch
}

function maybeAddTrailingSlash (path: string): string {
  // if it has an extension-like ending, don't add a trailing slash
  if (path.match(/\.[a-zA-Z0-9]{1,4}$/) != null) {
    return path
  }
  return path.endsWith('/') ? path : `${path}/`
}

/**
 * @see https://specs.ipfs.tech/http-gateways/path-gateway/#location-response-header
 */
export async function getRedirectResponse ({ resource, url, options, logger, cid, fetch = globalThis.fetch }: GetRedirectResponse): Promise<null | Response> {
  const log = logger.forComponent('helia:verified-fetch:get-redirect-response')
  const headers = new Headers(options?.headers)
  const forwardedHost = headers.get('x-forwarded-host')
  const headerHost = headers.get('host')
  const forwardedFor = headers.get('x-forwarded-for')

  if (forwardedFor == null && forwardedHost == null && headerHost == null) {
    log.trace('no redirect info found in headers')
    return null
  }

  log.trace('checking for redirect info')

  // if x-forwarded-host is passed, we need to set the location header to the
  // subdomain so that the browser can redirect to the correct subdomain
  try {
    const actualHost = forwardedHost ?? url.host
    const subdomainUrl = new URL(url)

    if (url.protocol === 'ipfs:' && cid.version === 0) {
      subdomainUrl.host = `${cid.toV1()}.ipfs.${actualHost}`
    } else {
      subdomainUrl.host = `${url.hostname}.ipns.${actualHost}`
    }

    if (headerHost?.match(SUBDOMAIN_GATEWAY_REGEX) != null) {
      log.trace('request was for a subdomain already, not setting location header')
      return null
    }

    if (headerHost != null && !subdomainUrl.host.includes(headerHost)) {
      log.trace('host header is not the same as the subdomain url host, not setting location header')
      return null
    }

    if (url.host === subdomainUrl.host) {
      log.trace('req url is the same as the subdomain url, not setting location header')
      return null
    }

    subdomainUrl.pathname = maybeAddTrailingSlash(url.pathname.replace(`/${url.hostname}`, '').replace(`/${url.protocol.slice(0, -1)}`, ''))

    log.trace('subdomain url %s', subdomainUrl.href)
    const pathUrl = new URL(url, `${url.protocol}//${actualHost}`)
    pathUrl.pathname = maybeAddTrailingSlash(url.pathname)
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
      log('subdomain not supported - %e', err)

      if (pathUrl.href === url.href) {
        log('path url is the same as the request url, not setting location header')

        return null
      }

      // pathUrl is different from request URL (maybe even with just a trailing slash)
      return movedPermanentlyResponse(resource.toString(), pathUrl.href)
    }
  } catch (err) {
    // if it's not a full URL, we have nothing left to do.
    log.error('error setting location header for x-forwarded-host - %e', err)
  }

  return null
}
