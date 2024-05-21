/**
 * Basically copies what .aegir.js does, but without all the env vars and setup.. just so you can run `node src/demo-server.ts` and test queries manually.
 */
import { logger } from '@libp2p/logger'
import getPort from 'aegir/get-port'
import { startBasicServer } from './fixtures/basic-server.js'
import { createKuboNode } from './fixtures/create-kubo.js'
import { loadKuboFixtures } from './fixtures/kubo-mgmt.js'
import { startReverseProxy } from './fixtures/reverse-proxy.js'

const log = logger('demo-server')

const KUBO_GATEWAY_PORT = await getPort(3440)
const SERVER_PORT = await getPort(3441)
const PROXY_PORT = await getPort(3442)
const { node: controller, gatewayUrl, repoPath } = await createKuboNode(KUBO_GATEWAY_PORT)

const kuboGateway = gatewayUrl
await controller.start()
const IPFS_NS_MAP = await loadKuboFixtures(repoPath, PROXY_PORT)

await startBasicServer({
  serverPort: SERVER_PORT,
  kuboGateway,
  IPFS_NS_MAP
})

await startReverseProxy({
  backendPort: SERVER_PORT,
  targetHost: 'localhost',
  proxyPort: PROXY_PORT
})

process.on('exit', () => {
  controller.stop().catch((err) => {
    log.error('Failed to stop controller', err)
    process.exit(1)
  })
})

export {}
