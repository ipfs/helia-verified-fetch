// @ts-check
import getPort from 'aegir/get-port'
// import { createServer } from 'ipfsd-ctl'
// import * as kuboRpcClient from 'kubo-rpc-client'
/** @type {import('aegir').PartialOptions} */
export default {
  test: {
    files: ['./dist/src/*.spec.js'],
    before: async (options) => {
      if (options.runner !== 'node') {
        throw new Error('Only node runner is supported')
      }
      // const { loadKuboFixtures, startKuboDaemon } = await import('./dist/src/fixtures/kubo-mgmt.js')
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

      // const daemon = await startKuboDaemon()

      return {
        controller,
        stopReverseProxy,
        stopBasicServer,
        env: {
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
      // const { stopReverseProxy } = await import('./dist/src/fixtures/reverse-proxy.js')
      // await stopReverseProxy()
      // await beforeResult.daemon.kill('SIGTERM', {
		  //   forceKillAfterTimeout: 2000
      // })
    }
  }
}
