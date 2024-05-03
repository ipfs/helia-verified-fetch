import { resolve } from 'node:path'
import { tmpdir } from 'node:os'

const IPFS_PATH = resolve(tmpdir(), 'verified-fetch-interop-ipfs-repo')

/** @type {import('aegir').PartialOptions} */
export default {
  dependencyCheck: {
    productionIgnorePatterns: ['.aegir.js']
  },
  test: {
    files: './dist/src/*.spec.js',
    before: async () => {

      const { createKuboNode } = await import('./dist/src/fixtures/create-kubo.js')
      const kuboNode = await createKuboNode(IPFS_PATH)

      await kuboNode.start()

      // requires aegir build to be run first, which it will by default.
      const { loadFixtures } = await import('./dist/src/fixtures/load-fixtures.js')

      await loadFixtures(IPFS_PATH)

      return {
        kuboNode
      }
    },
    after: async (_options, beforeResult) => {
      await beforeResult.kuboNode.stop()
    }
  }
}
