import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { createDelegatedRoutingV1HttpApiServer } from '@helia/delegated-routing-v1-http-api-server'
import { stubInterface } from 'sinon-ts'

const IPFS_PATH = resolve(tmpdir(), 'verified-fetch-interop-ipfs-repo')

/** @type {import('aegir').PartialOptions} */
export default {
  test: {
    files: './dist/src/*.spec.js',
    before: async () => {

      const { createKuboNode } = await import('./dist/src/fixtures/create-kubo.js')
      const kuboNode = await createKuboNode(IPFS_PATH)

      await kuboNode.start()

      // requires aegir build to be run first, which it will by default.
      const { loadFixtures } = await import('./dist/src/fixtures/load-fixtures.js')

      await loadFixtures(IPFS_PATH)

      const multiaddrs = (await kuboNode.api.id()).addresses
      const id = (await kuboNode.api.id()).id

      console.log(multiaddrs.map(ma => ma.toString()).join('\n'))

      const helia = stubInterface({
        routing: stubInterface({
          findProviders: async function * findProviders () {
            yield {
              multiaddrs,
              id,
              protocols: ['transport-bitswap']
            }
          }
        })
      })
      const routingServer = await createDelegatedRoutingV1HttpApiServer(helia, {
        listen: {
          host: '127.0.0.1',
          port: 0
        }
      })
      await routingServer.ready()

      const address = routingServer.server.address()
      const port = typeof address === 'string' ? address : address?.port

      return {
        kuboNode,
        routingServer,
        env: {
          KUBO_DIRECT_RETRIEVAL_ROUTER: `http://127.0.0.1:${port}`
        }
      }
    },
    after: async (_options, beforeResult) => {
      await beforeResult.kuboNode.stop()
      await beforeResult.routingServer.close()
    }
  }
}
