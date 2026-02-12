import { createVerifiedFetch } from '@helia/verified-fetch'
import { expect } from 'aegir/chai'
import type { VerifiedFetch } from '@helia/verified-fetch'

describe('verified-fetch abort handling', () => {
  let verifiedFetch: VerifiedFetch

  beforeEach(async () => {
    if (process.env.KUBO_DIRECT_RETRIEVAL_ROUTER == null || process.env.KUBO_DIRECT_RETRIEVAL_ROUTER === '') {
      throw new Error('KUBO_DIRECT_RETRIEVAL_ROUTER environment variable is required')
    }

    verifiedFetch = await createVerifiedFetch({
      gateways: [process.env.KUBO_DIRECT_RETRIEVAL_ROUTER],
      routers: [process.env.KUBO_DIRECT_RETRIEVAL_ROUTER],
      allowInsecure: true,
      allowLocal: true
    })
  })

  afterEach(async () => {
    await verifiedFetch?.stop()
  })

  it('should handle aborts properly', async function () {
    const signal = AbortSignal.timeout(1)

    await expect(verifiedFetch('ipfs://QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm/1 - Barrel - Part 1/1 - Barrel - Part 1 - alt.txt', {
      signal
    })).to.eventually.be.rejected.with.property('name', 'TimeoutError')
  })
})
