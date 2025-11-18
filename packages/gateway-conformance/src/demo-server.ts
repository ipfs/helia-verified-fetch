/**
 * Basically copies what .aegir.js does, but without all the env vars and setup.. just so you can run `node src/demo-server.ts` and test queries manually.
 */
import { logger } from '@libp2p/logger'
import getPort from 'aegir/get-port'
import { startVerifiedFetchGateway } from './fixtures/basic-server.js'
import { createKuboNode } from './fixtures/create-kubo.js'
import { loadKuboFixtures } from './fixtures/kubo-mgmt.js'
import type { KuboNode } from 'ipfsd-ctl'

const log = logger('demo-server')

const SERVER_PORT = await getPort(3441)

let kuboGateway: string | undefined
let controller: KuboNode | undefined
let IPFS_NS_MAP = ''
if (process.env.KUBO_GATEWAY == null) {
  const KUBO_GATEWAY_PORT = await getPort(3440)
  const kuboNodeDetails = await createKuboNode(KUBO_GATEWAY_PORT)
  controller = kuboNodeDetails.node
  kuboGateway = kuboNodeDetails.gatewayUrl
  const repoPath = kuboNodeDetails.repoPath
  await controller.start()
  IPFS_NS_MAP = await loadKuboFixtures(repoPath)
}

const stopServer = await startVerifiedFetchGateway({
  serverPort: SERVER_PORT,
  kuboGateway,
  IPFS_NS_MAP
})

process.on('exit', () => {
  stopServer().catch((err) => {
    log.error('Failed to stop server - %e', err)
  })
  controller?.stop().catch((err) => {
    log.error('Failed to stop controller - %e', err)
    process.exit(1)
  })
})

export {}
