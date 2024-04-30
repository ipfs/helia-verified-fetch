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
      const { loadKuboFixtures, kuboRepoDir } = await import('./dist/src/fixtures/kubo-mgmt.js')
      await loadKuboFixtures()

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

      /**
       * If we're on mac, automatically set CONFORMANCE_HOST to 'host.docker.internal'
       * You can disable this by setting DONT_FIX_DOCKER env var to any value
       */
      const CONFORMANCE_HOST = process.platform === 'darwin' && process.env.DONT_FIX_DOCKER == null ? 'host.docker.internal' : 'localhost'

      return {
        controller,
        stopReverseProxy,
        stopBasicServer,
        env: {
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
