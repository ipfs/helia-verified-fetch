import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { rmSync } from 'node:fs'
import { createDelegatedRoutingV1HttpApiServer } from '@helia/delegated-routing-v1-http-api-server'
import { stubInterface } from 'sinon-ts'
import { createKuboNode } from './src/fixtures/create-kubo.ts'
import { loadFixtures } from './src/fixtures/load-fixtures.ts'

const IPFS_PATH = resolve(tmpdir(), 'verified-fetch-interop-ipfs-repo')

/** @type {import('aegir').PartialOptions} */
export default {
  build: {
    bundlesizeMax: '1KB'
  },
  dependencyCheck: {
    ignore: [
      '@helia/delegated-routing-v1-http-api-server',
      'sinon-ts'
    ]

  },
  test: {
    files: './src/*.spec.ts',
    before: async () => {
      // kubo can be left in an inconsistent state if a previous test run was
      // killed so remove any runtime files
      [join(IPFS_PATH, 'api'), join(IPFS_PATH, 'repo.lock')].forEach((file) => {
        rmSync(file, {
          force: true
        })
      })

      const kuboNode = await createKuboNode(IPFS_PATH)
      await kuboNode.start()

      await loadFixtures(IPFS_PATH)

      const multiaddrs = (await kuboNode.api.id()).addresses
      const id = (await kuboNode.api.id()).id

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
