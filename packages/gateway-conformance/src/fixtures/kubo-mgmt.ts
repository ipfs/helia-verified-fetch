/**
 * This is required to update gateway-conformance fixtures
 *
 * Can only be ran from node
 *
 * external command dependencies:
 * - `docker`
 */

import { readFile } from 'node:fs/promises'
import { dirname, relative, posix, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Record as DhtRecord } from '@libp2p/kad-dht'
import { logger } from '@libp2p/logger'
import { peerIdFromCID, peerIdFromString } from '@libp2p/peer-id'
import { $ } from 'execa'
import fg from 'fast-glob'
import { Key } from 'interface-datastore'
import { multihashToIPNSRoutingKey } from 'ipns'
import { path } from 'kubo'
import { CID } from 'multiformats/cid'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { GWC_IMAGE } from '../constants.js'
import { getIpnsRecordDatastore } from './ipns-record-datastore.js'

// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = dirname(fileURLToPath(import.meta.url))

const log = logger('kubo-mgmt')

const kuboBinary = process.env.KUBO_BINARY ?? path()

export const GWC_FIXTURES_PATH = posix.resolve(__dirname, 'gateway-conformance-fixtures')

/**
 * use `createKuboNode' to start a kubo node prior to loading fixtures.
 */
export async function loadKuboFixtures (kuboRepoDir: string): Promise<string> {
  await downloadFixtures()

  return loadFixtures(kuboRepoDir)
}

function getExecaOptions ({ cwd, ipfsNsMap, kuboRepoDir }: { cwd?: string, ipfsNsMap?: string, kuboRepoDir?: string } = {}): { cwd: string, env: Record<string, string | undefined> } {
  return {
    cwd: cwd ?? __dirname,
    env: {
      IPFS_PATH: kuboRepoDir,
      IPFS_NS_MAP: ipfsNsMap
    }
  }
}

async function downloadFixtures (force = false): Promise<void> {
  if (!force) {
    // if the fixtures are already downloaded, we don't need to download them again
    const allFixtures = await fg.glob([`${GWC_FIXTURES_PATH}/**/*.car`, `${GWC_FIXTURES_PATH}/**/*.ipns-record`, `${GWC_FIXTURES_PATH}/dnslinks.IPFS_NS_MAP`])
    if (allFixtures.length > 0) {
      log('Fixtures already downloaded')
      return
    }
  }

  log('Downloading fixtures')
  try {
    await $`docker run --name gateway-conformance-fixture-loader -v ${process.cwd()}:/workspace -w /workspace ${GWC_IMAGE} extract-fixtures --directory ${relative('.', GWC_FIXTURES_PATH)} --merged false`
  } catch (e) {
    log.error('Error downloading fixtures, assuming current or previous success', e)
  } finally {
    // ensure the docker container is stopped and removed otherwise it will fail on subsequent runs
    await $`docker stop gateway-conformance-fixture-loader`
    await $`docker rm gateway-conformance-fixture-loader`
  }
}

export async function loadFixtures (kuboRepoDir: string): Promise<string> {
  const execaOptions = getExecaOptions({ kuboRepoDir })

  const carPath = `${GWC_FIXTURES_PATH}/**/*.car`
  log('Loading fixtures from %s', carPath)

  let loadedSomeCarFiles = false

  for (const carFile of await fg.glob(carPath)) {
    log('Loading *.car fixture %s', carFile)
    const { stdout } = await $(execaOptions)`${kuboBinary} dag import --pin-roots=false --offline ${carFile}`
    stdout.split('\n').forEach(log)
    loadedSomeCarFiles = true
  }
  if (!loadedSomeCarFiles) {
    log.error('No *.car fixtures found')
    throw new Error('No *.car fixtures found')
  }

  const datastore = getIpnsRecordDatastore()

  for (const fsIpnsRecord of await fg.glob([`${GWC_FIXTURES_PATH}/**/*.ipns-record`])) {
    const peerIdString = basename(fsIpnsRecord, '.ipns-record').split('_')[0]
    const relativePath = relative(GWC_FIXTURES_PATH, fsIpnsRecord)
    log('Loading *.ipns-record fixture %s', relativePath)
    let key
    if (peerIdString.startsWith('k51')) {
      /**
       * libp2p CID peerID
       *
       * @see https://github.com/libp2p/js-libp2p/blob/2feaeddb40712a5d58aee158021a10b9b9bbf660/doc/migrations/v1.0.0-v2.0.0.md?plain=1#L255
       */
      const cid = CID.parse(peerIdString)
      key = peerIdFromCID(cid)
    } else {
      key = peerIdFromString(peerIdString)
    }
    const customRoutingKey = multihashToIPNSRoutingKey(key.toMultihash())
    const dhtKey = new Key('/dht/record/' + uint8ArrayToString(customRoutingKey, 'base32'), false)

    const dhtRecord = new DhtRecord(customRoutingKey, await readFile(fsIpnsRecord, null), new Date(Date.now() + 9999999))

    await datastore.put(dhtKey, dhtRecord.serialize())
  }

  const ipfsNsMap = await readFile(`${GWC_FIXTURES_PATH}/dnslinks.IPFS_NS_MAP`, 'utf-8')

  return ipfsNsMap
}
