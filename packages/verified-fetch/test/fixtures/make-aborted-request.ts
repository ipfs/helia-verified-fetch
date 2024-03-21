import type { VerifiedFetch } from '../../src/verified-fetch.js'

export async function makeAbortedRequest (verifiedFetch: VerifiedFetch, [resource, options = {}]: Parameters<typeof verifiedFetch.fetch>, promise: Promise<any>): Promise<Response> {
  const controller = new AbortController()
  const resultPromise = verifiedFetch.fetch(resource, {
    ...options,
    signal: controller.signal
  })

  void promise.then(() => {
    controller.abort()
  })
  return resultPromise
}
