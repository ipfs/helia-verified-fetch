import { createVerifiedFetch } from '@helia/verified-fetch'
import { expect } from 'aegir/chai'
import { isNode, isBrowser } from 'wherearewe'
import type { CreateVerifiedFetchInit } from '@helia/verified-fetch'

/**
 * Currently only testing browser and node
 */
const describe = isNode || isBrowser ? global.describe : global.describe.skip

describe('@helia/verified-fetch - direct retrieval', () => {
  let directRetrievalRouterUrl: string
  let createVerifiedFetchInit: CreateVerifiedFetchInit

  beforeEach(async () => {
    if (process.env.KUBO_DIRECT_RETRIEVAL_ROUTER == null || process.env.KUBO_DIRECT_RETRIEVAL_ROUTER === '') {
      throw new Error('KUBO_DIRECT_RETRIEVAL_ROUTER environment variable is required')
    }
    directRetrievalRouterUrl = process.env.KUBO_DIRECT_RETRIEVAL_ROUTER
    createVerifiedFetchInit = {
      gateways: [],
      routers: [directRetrievalRouterUrl]
    }
    if (!isNode) {
      createVerifiedFetchInit.libp2pConfig = {
        connectionGater: {
          denyDialMultiaddr: () => false
        }
      }
    }
  })

  it('can fetch content directly from another node', async () => {
    const fetch = await createVerifiedFetch(createVerifiedFetchInit)

    const res = await fetch('ipfs://QmbQDovX7wRe9ek7u6QXe9zgCXkTzoUSsTFJEkrYV1HrVR/1 - Barrel - Part 1 - alt.txt')

    expect(res.status).to.equal(200)
    const body = await res.text()
    expect(body).to.equal('Don\'t we all.')

    await fetch.stop()
  })
})
