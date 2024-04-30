/**
 * This is part of the gateway conformance testing of helia-http-gateway. See ../DEVELOPER-NOTES.md for more details.
 */

import { writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, basename, relative } from 'node:path'
import debug from 'debug'
import { $, type Options } from 'execa'
import { glob } from 'glob'

const log = debug('kubo-init')
const error = log.extend('error')
debug.enable('kubo-init*')

const kuboFilePath = './scripts/tmp/kubo-path.txt'
const GWC_FIXTURES_PATH = `${dirname(kuboFilePath)}/fixtures`

async function main (): Promise<void> {
  await $`mkdir -p ${dirname(kuboFilePath)}`

  const tmpDir = await writeKuboMetaData()

  await attemptKuboInit(tmpDir)

  await configureKubo(tmpDir)

  const ipfsNsMap = await loadFixtures(tmpDir)
  // execute the daemon
  const execaOptions = getExecaOptions({ tmpDir, ipfsNsMap })
  log('Starting Kubo daemon...')
  await $(execaOptions)`npx kubo daemon --offline`
}

interface getExecaOptionsOptions {
  cwd?: string
  ipfsNsMap?: string
  tmpDir: string
}

function getExecaOptions ({ cwd, ipfsNsMap, tmpDir }: getExecaOptionsOptions): Options {
  return {
    cwd: cwd ?? undefined,
    env: {
      IPFS_PATH: tmpDir,
      IPFS_NS_MAP: ipfsNsMap
    }
  }
}

async function attemptKuboInit (tmpDir: string): Promise<void> {
  const execaOptions = getExecaOptions({ tmpDir })
  try {
    await $(execaOptions)`npx -y kubo init`
    log('Kubo initialized at %s', tmpDir)
  } catch (e: any) {
    if (e.stderr?.includes?.('already exists!') !== true) {
      throw e
    }
    log('Kubo was already initialized at %s', tmpDir)
  }
}

async function writeKuboMetaData (): Promise<string> {
  let tmpDir
  try {
    const currentIpfsPath = await readFile('./scripts/tmp/kubo-path.txt', 'utf-8')
    log('Existing kubo path found at %s', currentIpfsPath)
    tmpDir = currentIpfsPath
  } catch (e) {
    error('Failed to read Kubo path from %s', kuboFilePath, e)
    tmpDir = tmpdir() + '/kubo-tmp'
    log('Using temporary Kubo path at %s', tmpDir)
  }
  try {
    await writeFile(kuboFilePath, tmpDir)
  } catch (e) {
    error('Failed to save Kubo path to %s', kuboFilePath, e)
  }
  return tmpDir
}

async function configureKubo (tmpDir: string): Promise<void> {
  const execaOptions = getExecaOptions({ tmpDir })
  try {
    await $(execaOptions)`npx -y kubo config Addresses.Gateway /ip4/127.0.0.1/tcp/8080`
    await $(execaOptions)`npx -y kubo config --json Gateway.ExposeRoutingAPI true`
    log('Kubo configured')
  } catch (e) {
    error('Failed to configure Kubo', e)
  }
}

async function downloadFixtures (): Promise<void> {
  log('Downloading fixtures')
  try {
    await $`docker run -v ${process.cwd()}:/workspace -w /workspace ghcr.io/ipfs/gateway-conformance:v0.4.2 extract-fixtures --directory ${GWC_FIXTURES_PATH} --merged false`
  } catch (e) {
    error('Error downloading fixtures, assuming current or previous success', e)
  }
}

async function loadFixtures (tmpDir: string): Promise<string> {
  await downloadFixtures()
  const execaOptions = getExecaOptions({ tmpDir })

  for (const carFile of await glob([`${GWC_FIXTURES_PATH}/**/*.car`])) {
    log('Loading *.car fixture %s', carFile)
    const { stdout } = await $(execaOptions)`npx kubo dag import --pin-roots=false --offline ${carFile}`
    stdout.split('\n').forEach(log)
  }

  for (const ipnsRecord of await glob([`${GWC_FIXTURES_PATH}/**/*.ipns-record`])) {
    const key = basename(ipnsRecord, '.ipns-record')
    const relativePath = relative(GWC_FIXTURES_PATH, ipnsRecord)
    log('Loading *.ipns-record fixture %s', relativePath)
    const { stdout } = await $(({ ...execaOptions }))`cd ${GWC_FIXTURES_PATH} && npx kubo routing put --allow-offline "/ipns/${key}" "${relativePath}"`
    stdout.split('\n').forEach(log)
  }

  const json = await readFile(`${GWC_FIXTURES_PATH}/dnslinks.json`, 'utf-8')
  const { subdomains, domains } = JSON.parse(json)
  const subdomainDnsLinks = Object.entries(subdomains).map(([key, value]) => `${key}.example.com:${value}`).join(',')
  const domainDnsLinks = Object.entries(domains).map(([key, value]) => `${key}:${value}`).join(',')
  const ipfsNsMap = `${domainDnsLinks},${subdomainDnsLinks}`

  return ipfsNsMap
}

await main().catch((e) => {
  error(e)
  process.exit(1)
})
