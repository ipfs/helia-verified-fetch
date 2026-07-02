import { createVerifiedFetch } from '@helia/verified-fetch'
import { expect } from 'aegir/chai'
import { isNode, isBrowser } from 'wherearewe'
import type { CreateVerifiedFetchInit, VerifiedFetch } from '@helia/verified-fetch'

/**
 * Currently only testing browser and node
 */
const describe = isNode || isBrowser ? global.describe : global.describe.skip

describe('@helia/verified-fetch - direct retrieval', () => {
  let createVerifiedFetchInit: CreateVerifiedFetchInit
  let verifiedFetch: VerifiedFetch

  beforeEach(async () => {
    if (process.env.KUBO_DIRECT_RETRIEVAL_ROUTER == null || process.env.KUBO_DIRECT_RETRIEVAL_ROUTER === '') {
      throw new Error('KUBO_DIRECT_RETRIEVAL_ROUTER environment variable is required')
    }

    createVerifiedFetchInit = {
      gateways: [],
      routers: [
        process.env.KUBO_DIRECT_RETRIEVAL_ROUTER
      ]
    }

    if (!isNode) {
      createVerifiedFetchInit.libp2pConfig = {
        connectionGater: {
          denyDialMultiaddr: () => false
        }
      }
    }

    verifiedFetch = await createVerifiedFetch(createVerifiedFetchInit)
  })

  afterEach(async () => {
    await verifiedFetch?.stop()
  })

  it('can fetch content directly from another node', async () => {
    const res = await verifiedFetch('ipfs://QmbQDovX7wRe9ek7u6QXe9zgCXkTzoUSsTFJEkrYV1HrVR/1 - Barrel - Part 1 - alt.txt', {
      signal: AbortSignal.timeout(5_000)
    })

    expect(res.status).to.equal(200)
    const body = await res.text()
    expect(body).to.equal('Don\'t we all.')
  })
})
