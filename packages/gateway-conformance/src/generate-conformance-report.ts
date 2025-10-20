#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { access, constants } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { prefixLogger } from '@libp2p/logger'
import getPort from 'aegir/get-port'
import { execa } from 'execa'
import { Agent, setGlobalDispatcher } from 'undici'
import { GWC_IMAGE } from './constants.ts'
import { startVerifiedFetchGateway } from './fixtures/basic-server.ts'
import { createKuboNode } from './fixtures/create-kubo.ts'
import { loadKuboFixtures } from './fixtures/kubo-mgmt.ts'
import { getTestsToRun } from './get-tests-to-run.ts'
import { getTestsToSkip } from './get-tests-to-skip.ts'

const logger = prefixLogger('gateway-conformance')
const log = logger.forComponent('generate-conformance-report')
const KUBO_PORT = await getPort(3440)
process.env.KUBO_PORT = `${KUBO_PORT}`
const SERVER_PORT = await getPort(3441)
process.env.SERVER_PORT = `${SERVER_PORT}`
process.env.CONFORMANCE_HOST = 'localhost'

async function runSmokeTests (): Promise<void> {
  const log = logger.forComponent('smoke-tests')

  const testUrls = [
    { name: 'basic server path request', url: `http://localhost:${SERVER_PORT}/ipfs/bafkqabtimvwgy3yk` },
    { name: 'basic server subdomain request', url: `http://bafkqabtimvwgy3yk.ipfs.localhost:${SERVER_PORT}` }
  ]

  for (const { name, url } of testUrls) {
    log(`Running smoke test: ${name}`)
    try {
      const resp = await fetch(url)
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`)
      }
      if (resp.status !== 200) {
        throw new Error(`Expected status 200, got ${resp.status}`)
      }
      const text = await resp.text()
      if (text.trim() !== 'hello') {
        throw new Error(`Expected "hello", got "${text.trim()}"`)
      }
      log(`✓ ${name} passed`)
    } catch (error) {
      log.error(`✗ ${name} failed:`, error)
      throw error
    }
  }

  log('All smoke tests passed!')
}

export interface ConformanceGenerationReport {
  reportPath: string
  stdout: string
  stderr: string
}

function getGatewayConformanceBinaryPath (): string {
  if (process.env.GATEWAY_CONFORMANCE_BINARY != null) {
    return process.env.GATEWAY_CONFORMANCE_BINARY
  }
  const goPath = process.env.GOPATH ?? join(homedir(), 'go')
  return join(goPath, 'bin', 'gateway-conformance')
}

function getConformanceTestArgs (name: string, gwcArgs: string[] = [], goTestArgs: string[] = []): string[] {
  return [
    'test',
    `--gateway-url=http://127.0.0.1:${process.env.SERVER_PORT}`,
    `--subdomain-url=http://${process.env.CONFORMANCE_HOST}:${process.env.SERVER_PORT}`,
    '--verbose',
    '--json', `gwc-report-${name}.json`,
    ...gwcArgs,
    '--',
    '-timeout', '5m',
    ...goTestArgs
  ]
}

async function installBinary (binaryPath: string): Promise<void> {
  const log = logger.forComponent('install-binary')

  if (process.env.GATEWAY_CONFORMANCE_BINARY != null) {
    log('Using custom gateway-conformance binary at %s', binaryPath)
    return
  }

  const gwcVersion = GWC_IMAGE.split(':').pop()
  const { stdout, stderr } = await execa('go', ['install', `github.com/ipfs/gateway-conformance/cmd/gateway-conformance@${gwcVersion}`], { reject: true })
  log(stdout)
  log.error(stderr)
}

async function cleanupBinary (binaryPath: string): Promise<void> {
  const log = logger.forComponent('cleanup-binary')

  if (process.env.GATEWAY_CONFORMANCE_BINARY == null) {
    try {
      await execa('rm', [binaryPath])
      log('gateway-conformance binary successfully uninstalled.')
    } catch (error) {
      log.error(`Error removing "${binaryPath}"`, error)
    }
  } else {
    log('Not removing custom gateway-conformance binary at %s', binaryPath)
  }
}

export async function generateConformanceResults (
  name: string = 'all',
  options: {
    installBinary?: boolean
    cleanupBinary?: boolean
    gwcArgs?: string[]
    goTestArgs?: string[]
    timeout?: number
  } = {}
): Promise<ConformanceGenerationReport> {
  const {
    installBinary: shouldInstall = true,
    cleanupBinary: shouldCleanup = false,
    gwcArgs = [],
    goTestArgs = [],
    timeout = 200000
  } = options

  const binaryPath = getGatewayConformanceBinaryPath()
  let globalAgent: Agent | null = null
  // The Kubo gateway will be passed to the VerifiedFetch config
  const { node: controller, gatewayUrl, repoPath } = await createKuboNode(KUBO_PORT)
  await controller.start()
  const IPFS_NS_MAP = await loadKuboFixtures(repoPath)

  const stopBasicServer = await startVerifiedFetchGateway({
    serverPort: SERVER_PORT,
    kuboGateway: gatewayUrl,
    IPFS_NS_MAP
  })
  process.env.KUBO_GATEWAY = gatewayUrl
  process.env.IPFS_NS_MAP = IPFS_NS_MAP

  try {
    // install binary if requested
    if (shouldInstall && !existsSync(binaryPath)) {
      await installBinary(binaryPath)
    }

    // see https://stackoverflow.com/questions/71074255/use-custom-dns-resolver-for-any-request-in-nodejs
    // EVERY undici/fetch request host resolves to local IP. Without this, Node.js does not resolve subdomain requests properly
    globalAgent = new Agent({
      connect: {
        lookup: (_hostname, _options, callback) => { callback(null, [{ address: '0.0.0.0', family: 4 }]) }
      }
    })
    setGlobalDispatcher(globalAgent)

    // Run smoke tests if requested
    log('Running smoke tests to ensure basic server is working before conformance tests...')
    await runSmokeTests()

    if (process.env.SERVER_PORT == null) {
      throw new Error('SERVER_PORT env var is required')
    }
    if (process.env.CONFORMANCE_HOST == null) {
      throw new Error('CONFORMANCE_HOST env var is required')
    }

    // Get test configuration
    const testsToSkip: string[] = getTestsToSkip()
    const testsToRun: string[] = getTestsToRun()

    // Build test arguments
    const testArgs = [
      ...(testsToRun.length > 0 ? ['-run', `${testsToRun.join('|')}`] : []),
      ...(testsToSkip.length > 0 ? ['-skip', `${testsToSkip.join('|')}`] : []),
      ...goTestArgs
    ]

    // Run conformance tests
    const reportPath = `gwc-report-${name}.json`
    const cancelSignal = AbortSignal.timeout(timeout)

    const { stderr, stdout } = await execa(
      binaryPath,
      getConformanceTestArgs(name, gwcArgs, testArgs),
      { reject: false, cancelSignal }
    )

    if (cancelSignal.aborted) {
      throw new Error('Conformance tests timed out')
    }

    log(stdout)
    log.error(stderr)

    // Verify report was generated
    await access(reportPath, constants.R_OK)
    log('report generated and file exists')

    return {
      reportPath,
      stdout,
      stderr
    }
  } finally {
    // Cleanup binary if requested
    if (shouldCleanup) {
      await cleanupBinary(binaryPath)
    }
    await globalAgent?.close()
    await stopBasicServer()
    await controller.stop()
  }
}

// CLI interface for standalone usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const name = process.argv[2] ?? 'all'
  const shouldCleanup = process.argv.includes('--cleanup')

  generateConformanceResults(name, { cleanupBinary: shouldCleanup })
    .then((result) => {
      log(`Report generated: ${result.reportPath}`)
      log('stdout:', result.stdout)
      if (result.stderr) {
        log('stderr:', result.stderr)
      }
    })
    .catch((error) => {
      log.error('Failed to generate conformance results - %e', error)
      // eslint-disable-next-line no-console
      console.error(error)
      process.exit(1)
    }).finally(() => {
      setTimeout(() => {
        log('killing process that would have hung')
        process.exit(0)
      }, 1000)
    })
}
