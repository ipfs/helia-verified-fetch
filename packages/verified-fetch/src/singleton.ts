import { createVerifiedFetch } from './index.ts'
import type { Resource, VerifiedFetch, VerifiedFetchInit } from './index.ts'

let impl: VerifiedFetch | undefined

export const verifiedFetch: VerifiedFetch = async function verifiedFetch (resource: Resource, options?: VerifiedFetchInit): Promise<Response> {
  if (impl == null) {
    impl = await createVerifiedFetch()
  }

  return impl(resource, options)
}

verifiedFetch.start = async function () {
  await impl?.start()
}

verifiedFetch.stop = async function () {
  await impl?.stop()
}
