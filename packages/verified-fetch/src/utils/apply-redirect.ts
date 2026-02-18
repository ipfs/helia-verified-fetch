import escape from 'regexp.escape'
import { DuplicatePlaceholderError, InvalidRedirectsFileError, InvalidRedirectStatusCodeError, RedirectsFileTooLargeError } from '../errors.ts'
import { errorToObject } from './error-to-object.ts'

/**
 * @see https://specs.ipfs.tech/http-gateways/web-redirects-file/#status
 */
const ALLOWED_STATUSES = [
  200, 301, 302, 303, 307, 308, 404, 410, 451
]

/**
 * @see https://specs.ipfs.tech/http-gateways/web-redirects-file/#max-file-size
 */
const MAX_REDIRECTS_FILE_SIZE = 65_536

interface Redirect {
  from: RegExp
  to: string
  status: number
}

export interface ApplyRedirectsOptions {
  redirect?: RequestInit['redirect']
}

/**
 * Examine the passed redirects file and translate the passed path.
 *
 * If `undefined` is returned it means no redirect was necessary.
 * If a `string` is returned, an internal redirect to that path should be performed
 * If a `Response` is returned, the user has signalled they wish to process
 * redirects manually so it should be returned as a response
 */
export function applyRedirects (url: URL, _redirects: string, options: ApplyRedirectsOptions = {}): URL | Response | undefined {
  try {
    // @see https://specs.ipfs.tech/http-gateways/web-redirects-file/#max-file-size
    if (_redirects.length > MAX_REDIRECTS_FILE_SIZE) {
      throw new RedirectsFileTooLargeError(`_redirects file size cannot exceed ${MAX_REDIRECTS_FILE_SIZE} bytes`)
    }

    const redirects: Redirect[] = _redirects
      .split('\n')
      .filter(line => {
        line = line.trim()

        return line !== '' && !line.startsWith('#')
      })
      .map(line => {
        const [from, to, status] = line
          .split(/\s+/)
          .map(s => s.trim())

        if (status != null && status !== '' && !status.match(/^\d+$/)) {
          throw new InvalidRedirectsFileError('Invalid status code in _redirects file')
        }

        let statusCode = parseInt(status)

        if (isNaN(statusCode)) {
          // @see https://specs.ipfs.tech/http-gateways/web-redirects-file/#status
          statusCode = 301
        }

        // @see https://specs.ipfs.tech/http-gateways/web-redirects-file/#status
        if (!ALLOWED_STATUSES.includes(statusCode)) {
          throw new InvalidRedirectStatusCodeError(`Status code ${statusCode} is not allowed`)
        }

        const placeholders = new Set<string>()

        const fromParts = from.split('/')
        const fromPattern = fromParts.map((key, index) => {
          if (key.startsWith(':')) {
            const placeholder = key.substring(1)
            if (placeholders.has(placeholder)) {
              // @see https://specs.ipfs.tech/http-gateways/web-redirects-file/#placeholders
              throw new DuplicatePlaceholderError('Duplicate placeholders in from path')
            }

            placeholders.add(placeholder)

            // @see https://specs.ipfs.tech/http-gateways/web-redirects-file/#placeholders
            return `(?<${placeholder}>[^/]+)`
          }

          if (key === '*' && index === (fromParts.length - 1)) {
            // @see https://specs.ipfs.tech/http-gateways/web-redirects-file/#catch-all-splat
            return '(?<splat>.+)'
          }

          // TODO: use RegExp.escape - requires Node.js 24+
          return escape(key)
        })
          .join('\\/')

        return {
          from: new RegExp(fromPattern),
          to,
          status: statusCode
        }
      })

    for (const { from, to, status } of redirects) {
      const match = url.pathname.match(from)

      if (match == null) {
        continue
      }

      return toResult(url, to, status, match.groups, options)
    }
  } catch (err: any) {
    // must be a 500
    // @see https://specs.ipfs.tech/http-gateways/web-redirects-file/#error-handling
    return new Response(JSON.stringify(errorToObject(err), null, 2), {
      status: 500
    })
  }
}

function toResult (url: URL, to: string, status: number, groups?: Record<string, string> | null, options: ApplyRedirectsOptions = {}): URL | Response {
  // cannot continue with redirect set to 'error'
  if (options.redirect === 'error') {
    throw new TypeError('Failed to fetch')
  }

  if (groups != null) {
    // placeholders or splat present
    for (const [key, value] of Object.entries(groups)) {
      to = to.replaceAll(`:${key}`, value)
    }
  }

  // preserve query/hash/etc from original URL
  // @see https://specs.ipfs.tech/http-gateways/web-redirects-file/#query-parameters
  const search = createSearch(url, new URL(`${url.protocol}//${url.host}${to}`))
  const rawLocation = new URL(`${url.protocol}//${url.host}${to}`)

  const location = new URL(`${url.protocol}//${url.host}${rawLocation.pathname}${formatSearch(search)}${url.hash}`)

  if (options.redirect === 'manual') {
    return new Response('', {
      status,
      headers: {
        location: location.toString()
      }
    })
  }

  return location
}

function createSearch (userUrl: URL, redirectUrl: URL): Record<string, string | string[]> {
  const search: Record<string, string | string[]> = {}

  for (const [key, value] of userUrl.searchParams) {
    redirectUrl.searchParams.delete(key)
    addToSearch(key, value, search)
  }

  for (const [key, value] of redirectUrl.searchParams) {
    addToSearch(key, value, search)
  }

  return search
}

function addToSearch (key: string, value: string, search: Record<string, string | string[]>): void {
  if (typeof search[key] === 'string') {
    search[key] = [search[key]]
  }

  if (Array.isArray(search[key])) {
    search[key].push(value)
  } else {
    search[key] = value
  }
}

/**
 * Turns a record of key/value pairs into a URL-safe search params string
 *
 * We cannot use the native URLSearchParams to encode as it uses
 * `application/x-www-form-urlencoded` encoding which encodes " " as "+" and
 * not "%20" so use encodeURIComponent instead
 */
export function formatSearch (params: Record<string, string | string[]>): string {
  const search = [...Object.entries(params)]
    .map(([key, value]) => {
      if (!Array.isArray(value)) {
        value = [value]
      }

      return value
        .map(val => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
        .join('&')
    })
    .join('&')

  if (search === '') {
    return search
  }

  return `?${search}`
}
