import { CodeError, type AbortOptions, type ComponentLogger } from '@libp2p/interface'
import { type VerifiedFetchInit, type Resource } from '../index.js'
import { matchURLString } from './parse-url-string.js'
import type { CID } from 'multiformats/cid'

interface GetRedirectResponseOptions {
  cid: CID
  resource: Resource
  options?: Omit<VerifiedFetchInit, 'signal'> & AbortOptions
  logger: ComponentLogger
}

interface GetSubdomainRedirectOptions extends GetRedirectResponseOptions {
  resource: string
}

/**
 * If given only a path, i.e. /ipfs/QmHash, this function will return the path only, with a trailing slash if the path part doesn't have an extension-like ending.
 * If given a full URL, it will return that same URL, with a trailing slash on the path if the path part doesn't have an extension-like ending.
 *
 * This is only used for directory normalization with UnixFS directory requests.
 */
export function getSpecCompliantPath (resource: string): string {
  let url: URL
  let isInvalidURL = false
  try {
    url = new URL(resource)
  } catch {
    isInvalidURL = true
    url = new URL(resource, 'http://example.com')
  }
  const { pathname } = url

  let specCompliantPath = pathname

  if (pathname.match(/\.[a-zA-Z0-9]{1,4}$/) == null && !pathname.endsWith('/')) {
    // no extension-like ending, add a trailing slash
    specCompliantPath = `${pathname}/`
  }

  if (isInvalidURL) {
    return specCompliantPath
  }

  // the below is needed to get around a bug with some environments removing the trailing slash when calling url.href or url.toString()
  if (specCompliantPath.startsWith('//')) {
    // likely ipfs:// or ipns:// url
    return `${url.protocol}${specCompliantPath}${url.search}${url.hash}`
  }
  return `${url.protocol}//${url.host}${specCompliantPath}${url.search}${url.hash}`
}

/**
 * Handles determining if a redirect to subdomain is needed.
 */
export async function getRedirectUrl ({ resource, options, logger, cid }: GetSubdomainRedirectOptions): Promise<string> {
  const log = logger.forComponent('helia:verified-fetch:get-subdomain-redirect')
  const headers = new Headers(options?.headers)
  const forwardedHost = headers.get('x-forwarded-host')
  const headerHost = headers.get('host')
  const forwardedProto = headers.get('x-forwarded-proto')

  try {
    const urlParts = matchURLString(resource)
    if (urlParts.cidOrPeerIdOrDnsLink.length > 63) {
      if (urlParts.protocol === 'ipfs') {
        throw new CodeError('CID incompatible with DNS label length limit of 63', 'DNS_LABEL_INCOMPATIBLE_CID_SUBDOMAIN')
      }
      throw new CodeError('PeerId or DNSLink incompatible with DNS label length limit of 63', 'DNS_LABEL_INCOMPATIBLE_SUBDOMAIN')
    }

    if (forwardedHost == null && forwardedProto == null) {
      log.trace('no redirect info found in headers')
      throw new CodeError('No redirect info found in headers', 'NO_REDIRECT_INFO_FOUND')
    }
    const reqUrl = new URL(resource)
    reqUrl.protocol = forwardedProto ?? reqUrl.protocol
    const actualHost = forwardedHost ?? reqUrl.host
    const subdomain = `${urlParts.cidOrPeerIdOrDnsLink}.${urlParts.protocol}`
    if (actualHost.includes(subdomain)) {
      log.trace('request was for a subdomain already. Returning requested resource.')
      return resource
    }

    let subdomainHost = `${urlParts.cidOrPeerIdOrDnsLink}.${urlParts.protocol}.${actualHost}`

    if (urlParts.protocol === 'ipfs' && cid.version === 0) {
      subdomainHost = `${cid.toV1()}.ipfs.${actualHost}`
    }
    const subdomainUrl = new URL(reqUrl)
    subdomainUrl.host = subdomainHost
    subdomainUrl.pathname = reqUrl.pathname.replace(`/${urlParts.cidOrPeerIdOrDnsLink}`, '').replace(`/${urlParts.protocol}`, '')

    if (headerHost != null && headerHost === subdomainUrl.host) {
      log.trace('request was for a subdomain already. Returning requested resource.')
      return resource
    }

    return subdomainUrl.toString()
  } catch (err: any) {
    log.error('error while checking for subdomain support', err)
    if (err.code != null) {
      throw err
    }
  }

  return resource
}
