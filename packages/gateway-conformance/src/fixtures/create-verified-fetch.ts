import type { Helia } from '@helia/interface'
import type { CreateVerifiedFetchInit, CreateVerifiedFetchOptions, VerifiedFetch } from '@helia/verified-fetch'
export async function createVerifiedFetch (init?: CreateVerifiedFetchInit | Helia, options?: CreateVerifiedFetchOptions): Promise<VerifiedFetch> {
  const { createVerifiedFetch: createVerifiedFetchOriginal } = await import(process.env.VERIFIED_FETCH ?? '@helia/verified-fetch')

  return createVerifiedFetchOriginal(init, options)
}
