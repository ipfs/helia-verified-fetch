import type { CreateVerifiedFetchInit, CreateVerifiedFetchOptions, VerifiedFetch } from '@helia/verified-fetch'

export async function createVerifiedFetch (init?: CreateVerifiedFetchInit, options?: CreateVerifiedFetchOptions): Promise<VerifiedFetch> {
  const { createVerifiedFetch } = await import(process.env.VERIFIED_FETCH ?? '@helia/verified-fetch')

  return createVerifiedFetch(init, options)
}
