// @ts-check
import getPort from 'aegir/get-port'

/** @type {import('aegir').PartialOptions} */
export default {
  test: {
    files: ['./dist/src/*.spec.js'],
    before: async (options) => {
      if (options.runner !== 'node') {
        throw new Error('Only node runner is supported')
      }

      const { GWC_IMAGE } = await import('./dist/src/constants.js')
      const { loadKuboFixtures, kuboRepoDir } = await import('./dist/src/fixtures/kubo-mgmt.js')
      const IPFS_NS_MAP = await loadKuboFixtures()

      const { createKuboNode } = await import('./dist/src/fixtures/create-kubo.js')
      const controller = await createKuboNode(await getPort(3440))
      await controller.start()
      const kuboGateway = `http://${controller.api.gatewayHost}:${controller.api.gatewayPort}`

      const { startBasicServer } = await import('./dist/src/fixtures/basic-server.js')
      const SERVER_PORT = await getPort(3441)
      const stopBasicServer = await startBasicServer({
        serverPort: SERVER_PORT,
        kuboGateway
      })

      const { startReverseProxy } = await import('./dist/src/fixtures/reverse-proxy.js')
      const PROXY_PORT = await getPort(3442)
      const KUBO_PORT = controller.api.gatewayPort
      const stopReverseProxy = await startReverseProxy({
        backendPort: SERVER_PORT,
        targetHost: 'localhost',
        proxyPort: PROXY_PORT
      })

      const CONFORMANCE_HOST = 'localhost'

      return {
        controller,
        stopReverseProxy,
        stopBasicServer,
        env: {
          IPFS_NS_MAP,
          GWC_IMAGE,
          CONFORMANCE_HOST,
          KUBO_PORT: `${KUBO_PORT}`,
          PROXY_PORT: `${PROXY_PORT}`,
          SERVER_PORT: `${SERVER_PORT}`,
          KUBO_GATEWAY: kuboGateway,
          KUBO_REPO: process.env.KUBO_REPO || kuboRepoDir
        }
      }
    },
    after: async (options, beforeResult) => {
      // @ts-expect-error - broken aegir types
      await beforeResult.stopReverseProxy()
      // @ts-expect-error - broken aegir types
      await beforeResult.stopBasicServer()
      // @ts-expect-error - broken aegir types
      await beforeResult.controller.stop()
    }
  }
}
