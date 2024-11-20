import { createVerifiedFetch } from '@helia/verified-fetch'
import { expect } from 'aegir/chai'

describe('@helia/verified-fetch - direct retrieval', () => {
  let directRetrievalRouterUrl: string

  beforeEach(async () => {
    if (process.env.KUBO_DIRECT_RETRIEVAL_ROUTER == null || process.env.KUBO_DIRECT_RETRIEVAL_ROUTER === '') {
      throw new Error('KUBO_DIRECT_RETRIEVAL_ROUTER environment variable is required')
    }
    directRetrievalRouterUrl = process.env.KUBO_DIRECT_RETRIEVAL_ROUTER
  })

  it('can fetch content directly from another node', async () => {
    // console.log(process.env.KUBO_MADDRS)
    // we want to disable trustless gateways and use direct retrieval
    // const customRouter = stubInterface<Required<Pick<BlockBroker, 'retrieve' | 'createSession'>>

    const fetch = await createVerifiedFetch({
      gateways: [],
      routers: [directRetrievalRouterUrl]
    })

    const foo = await fetch('ipfs://QmbQDovX7wRe9ek7u6QXe9zgCXkTzoUSsTFJEkrYV1HrVR/1 - Barrel - Part 1 - alt.txt')

    expect(foo.status).to.equal(200)
    const body = await foo.text()
    expect(body).to.equal('Don\'t we all.')

    await fetch.stop()
  })
})
