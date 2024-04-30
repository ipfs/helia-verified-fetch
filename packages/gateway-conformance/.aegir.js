import getPort from 'aegir/get-port'
// import { createServer } from 'ipfsd-ctl'
// import * as kuboRpcClient from 'kubo-rpc-client'

/** @type {import('aegir').PartialOptions} */
export default {
  test: {
    files: './dist/src/*.spec.js',
    before: async (options) => {
      if (options.runner !== 'node') {
        throw new Error('Only node runner is supported')
      }
      // const { loadKuboFixtures, startKuboDaemon } = await import('./dist/src/fixtures/kubo-mgmt.js')
      const { loadKuboFixtures, kuboRepoDir } = await import('./dist/src/fixtures/kubo-mgmt.js')
      await loadKuboFixtures()

      const { createKuboNode } = await import('./dist/src/fixtures/create-kubo.js')
      const controller = await createKuboNode()
      await controller.start()

      const { startReverseProxy } = await import('./dist/src/fixtures/reverse-proxy.js')
      const PROXY_PORT = await getPort()
      const stopReverseProxy = await startReverseProxy({
        backendPort: controller.api.gatewayPort,
        targetHost: controller.api.gatewayHost,
        proxyPort: PROXY_PORT
      })

      // const daemon = await startKuboDaemon()

      return {
        controller,
        stopReverseProxy,
        env: {
          PROXY_PORT,
          KUBO_GATEWAY: `http://localhost:${PROXY_PORT}`,
          KUBO_REPO: process.env.KUBO_REPO || kuboRepoDir
        }
      }
    },
    after: async (options, beforeResult) => {
      await beforeResult.controller.stop()
      await beforeResult.stopReverseProxy()
      // const { stopReverseProxy } = await import('./dist/src/fixtures/reverse-proxy.js')
      // await stopReverseProxy()
      // await beforeResult.daemon.kill('SIGTERM', {
		  //   forceKillAfterTimeout: 2000
      // })
    }
  }
}
