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
import { logger } from '@libp2p/logger'
import { $ } from 'execa'
import fg from 'fast-glob'
import { path } from 'kubo'
import { GWC_IMAGE } from '../constants.js'

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
    const allFixtures = await fg.glob([`${GWC_FIXTURES_PATH}/**/*.car`, `${GWC_FIXTURES_PATH}/**/*.ipns-record`, `${GWC_FIXTURES_PATH}/dnslinks.json`])
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

  // TODO: fix in CI. See https://github.com/ipfs/helia-verified-fetch/actions/runs/9022946675/job/24793649918?pr=67#step:7:19
  if (process.env.CI == null) {
    for (const ipnsRecord of await fg.glob([`${GWC_FIXTURES_PATH}/**/*.ipns-record`])) {
      const key = basename(ipnsRecord, '.ipns-record')
      const relativePath = relative(GWC_FIXTURES_PATH, ipnsRecord)
      log('Loading *.ipns-record fixture %s', relativePath)
      const { stdout } = await $(({ ...execaOptions }))`cd ${GWC_FIXTURES_PATH} && ${kuboBinary} routing put --allow-offline "/ipns/${key}" "${relativePath}"`
      stdout.split('\n').forEach(log)
    }
  }

  const json = await readFile(`${GWC_FIXTURES_PATH}/dnslinks.json`, 'utf-8')
  const { subdomains, domains } = JSON.parse(json)
  const subdomainDnsLinks = Object.entries(subdomains).map(([key, value]) => `${key}.example.com:${value}`).join(',')
  const domainDnsLinks = Object.entries(domains).map(([key, value]) => `${key}:${value}`).join(',')
  const ipfsNsMap = `${domainDnsLinks},${subdomainDnsLinks}`

  return ipfsNsMap
}
