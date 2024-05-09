/**
 * Basically copies what .aegir.js does, but without all the env vars and setup.. just so you can run `node src/demo-server.ts` and test queries manually.
 */
import getPort from 'aegir/get-port'

const { loadKuboFixtures } = await import('./fixtures/kubo-mgmt.js')
await loadKuboFixtures()

const { createKuboNode } = await import('./fixtures/create-kubo.js')
const controller = await createKuboNode(await getPort(3440))
await controller.start()
const kuboGateway = `http://${controller.api.gatewayHost}:${controller.api.gatewayPort}`

const { startBasicServer } = await import('./fixtures/basic-server.js')
const SERVER_PORT = await getPort(3441)
await startBasicServer({
  serverPort: SERVER_PORT,
  kuboGateway
})

const { startReverseProxy } = await import('./fixtures/reverse-proxy.js')
const PROXY_PORT = await getPort(3442)
await startReverseProxy({
  backendPort: SERVER_PORT,
  targetHost: 'localhost',
  proxyPort: PROXY_PORT
})

export {}
