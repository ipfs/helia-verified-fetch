/**
 * This is required to update gateway-conformance fixtures
 *
 * Can only be ran from node
 *
 * external command dependencies:
 * - `docker`
 * - `npx`
 */

import { readFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { logger } from '@libp2p/logger'
import { $, type ExecaChildProcess } from 'execa'
import { glob } from 'glob'
import { path } from 'kubo'
import { GWC_IMAGE } from '../constants.js'

// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = dirname(fileURLToPath(import.meta.url))

const log = logger('kubo-mgmt')

const kuboBinary = process.env.KUBO_BINARY ?? path()

// This needs to match the `repo` property provided to `ipfsd-ctl` in `createKuboNode` so our kubo instance in tests use the same repo
export const kuboRepoDir = process.env.KUBO_REPO ?? resolve(__dirname, 'data/test-repo')
export const GWC_FIXTURES_PATH = resolve(__dirname, 'data/gateway-conformance-fixtures')

export async function loadKuboFixtures (): Promise<void> {
  await $`mkdir -p ${kuboRepoDir}`
  await $`mkdir -p ${GWC_FIXTURES_PATH}`

  await attemptKuboInit()

  await downloadFixtures()

  await loadFixtures()
}

export async function startKuboDaemon (): Promise<ExecaChildProcess> {
  const ipfsNsMap = await loadFixtures()

  const execaOptions = getExecaOptions({ ipfsNsMap })
  log('Starting Kubo daemon...')
  const daemon = $(execaOptions)`${kuboBinary} daemon --offline`

  if (daemon == null || (daemon.stdout == null || daemon.stderr == null)) {
    throw new Error('failed to start kubo daemon')
  }
  daemon.stdout.on('data', (data) => {
    log(data.toString())
  })
  daemon.stderr.on('data', (data) => {
    log.trace(data.toString())
  })

  // wait for "daemon is ready" message
  await new Promise((resolve, reject) => {
    daemon.stdout?.on('data', (data: string) => {
      if (data.includes('Daemon is ready')) {
      // @ts-expect-error - nothing needed here.
        resolve()
        log('Kubo daemon is ready')
      }
    })
    const timeout = setTimeout(() => {
      reject(new Error('kubo daemon failed to start'))
      clearTimeout(timeout)
    }, 5000)
  })

  return daemon
}

function getExecaOptions ({ cwd, ipfsNsMap }: { cwd?: string, ipfsNsMap?: string } = {}): { cwd: string, env: Record<string, string | undefined> } {
  return {
    cwd: cwd ?? __dirname,
    env: {
      IPFS_PATH: kuboRepoDir,
      IPFS_NS_MAP: ipfsNsMap
    }
  }
}

async function attemptKuboInit (): Promise<void> {
  const execaOptions = getExecaOptions()
  try {
    await $(execaOptions)`${kuboBinary} init`
    log('Kubo initialized at %s', kuboRepoDir)

    await configureKubo()
  } catch (e: any) {
    if (e.stderr?.includes('ipfs daemon is running') === true) {
      log('Kubo is already running')
      return
    }
    if (e.stderr?.includes('already exists!') === true) {
      log('Kubo was already initialized at %s', kuboRepoDir)
      return
    }

    throw e
  }
}

async function configureKubo (): Promise<void> {
  const execaOptions = getExecaOptions()
  try {
    // some of the same things as https://github.com/ipfs/kubo/blob/62eb1439157ea8de385671cb513e8ece10e43baf/config/profile.go#L73
    await $(execaOptions)`${kuboBinary} config Addresses.Gateway /ip4/127.0.0.1/tcp/0`
    await $(execaOptions)`${kuboBinary} config Addresses.API /ip4/127.0.0.1/tcp/0`
    await $(execaOptions)`${kuboBinary} config --json Bootstrap '[]'`
    await $(execaOptions)`${kuboBinary} config --json Swarm.DisableNatPortMap true`
    await $(execaOptions)`${kuboBinary} config --json Discovery.MDNS.Enabled false`
    await $(execaOptions)`${kuboBinary} config --json Gateway.NoFetch true`
    await $(execaOptions)`${kuboBinary} config --json Gateway.ExposeRoutingAPI true`
    await $(execaOptions)`${kuboBinary} config --json Gateway.HTTPHeaders.Access-Control-Allow-Origin '["*"]'`
    await $(execaOptions)`${kuboBinary} config --json Gateway.HTTPHeaders.Access-Control-Allow-Methods '["GET", "POST", "PUT", "OPTIONS"]'`
    log('Kubo configured')
  } catch (e) {
    log.error('Failed to configure Kubo', e)
  }
}

async function downloadFixtures (force = false): Promise<void> {
  if (!force) {
    // if the fixtures are already downloaded, we don't need to download them again
    const allFixtures = await glob([`${GWC_FIXTURES_PATH}/**/*.car`, `${GWC_FIXTURES_PATH}/**/*.ipns-record`, `${GWC_FIXTURES_PATH}/dnslinks.json`])
    if (allFixtures.length > 0) {
      log('Fixtures already downloaded')
      return
    }
  }

  log('Downloading fixtures')
  try {
    await $`docker run --name gateway-conformance -v ${process.cwd()}:/workspace -w /workspace ${GWC_IMAGE} extract-fixtures --directory ${relative('.', GWC_FIXTURES_PATH)} --merged false`
  } catch (e) {
    log.error('Error downloading fixtures, assuming current or previous success', e)
  }
}

async function loadFixtures (): Promise<string> {
  const execaOptions = getExecaOptions()

  for (const carFile of await glob([`${resolve(__dirname, 'data')}/**/*.car`])) {
    log('Loading *.car fixture %s', carFile)
    const { stdout } = await $(execaOptions)`${kuboBinary} dag import --pin-roots=false --offline ${carFile}`
    stdout.split('\n').forEach(log)
  }

  // TODO: re-enable this when we resolve CI issue: see https://github.com/ipfs-shipyard/service-worker-gateway/actions/runs/8442583023/job/23124336180?pr=159#step:6:13
  // for (const ipnsRecord of await glob([`${GWC_FIXTURES_PATH}/**/*.ipns-record`])) {
  //   const key = basename(ipnsRecord, '.ipns-record')
  //   const relativePath = relative(GWC_FIXTURES_PATH, ipnsRecord)
  //   log('Loading *.ipns-record fixture %s', relativePath)
  //   const { stdout } = await $(({ ...execaOptions }))`cd ${GWC_FIXTURES_PATH} && ${kuboBinary} routing put --allow-offline "/ipns/${key}" "${relativePath}"`
  //   stdout.split('\n').forEach(log)
  // }

  const json = await readFile(`${GWC_FIXTURES_PATH}/dnslinks.json`, 'utf-8')
  const { subdomains, domains } = JSON.parse(json)
  const subdomainDnsLinks = Object.entries(subdomains).map(([key, value]) => `${key}.example.com:${value}`).join(',')
  const domainDnsLinks = Object.entries(domains).map(([key, value]) => `${key}:${value}`).join(',')
  const ipfsNsMap = `${domainDnsLinks},${subdomainDnsLinks}`

  // TODO: provide this to kubo instance in tests
  return ipfsNsMap
}
