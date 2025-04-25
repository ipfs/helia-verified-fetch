/* eslint-env mocha */
import { access, constants } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { prefixLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { execa } from 'execa'
import { Agent, setGlobalDispatcher } from 'undici'
import { GWC_IMAGE } from './constants.js'
import expectedFailingTests from './expected-failing-tests.json' with { type: 'json' }
import expectedPassingTests from './expected-passing-tests.json' with { type: 'json' }
import { getReportDetails } from './get-report-details.js'
import { getTestsToRun } from './get-tests-to-run.js'
import { getTestsToSkip } from './get-tests-to-skip.js'

const logger = prefixLogger('gateway-conformance')

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

describe('@helia/verified-fetch - gateway conformance', function () {
  before(async () => {
    if (process.env.KUBO_GATEWAY == null) {
      throw new Error('KUBO_GATEWAY env var is required')
    }
    if (process.env.SERVER_PORT == null) {
      throw new Error('SERVER_PORT env var is required')
    }
    if (process.env.CONFORMANCE_HOST == null) {
      throw new Error('CONFORMANCE_HOST env var is required')
    }
    // see https://stackoverflow.com/questions/71074255/use-custom-dns-resolver-for-any-request-in-nodejs
    // EVERY undici/fetch request host resolves to local IP. Without this, Node.js does not resolve subdomain requests properly
    const staticDnsAgent = new Agent({
      connect: {
        lookup: (_hostname, _options, callback) => { callback(null, [{ address: '0.0.0.0', family: 4 }]) }
      }
    })
    setGlobalDispatcher(staticDnsAgent)
  })

  describe('smokeTests', () => {
    [
      ['basic server path request works', `http://localhost:${process.env.SERVER_PORT}/ipfs/bafkqabtimvwgy3yk`],
      ['basic server subdomain request works', `http://bafkqabtimvwgy3yk.ipfs.localhost:${process.env.SERVER_PORT}`]
    ].forEach(([name, url]) => {
      it(name, async () => {
        const resp = await fetch(url)
        expect(resp).to.be.ok()
        expect(resp.status).to.equal(200)
        const text = await resp.text()
        expect(text.trim()).to.equal('hello')
      })
    })
  })

  describe('conformance testing', () => {
    const binaryPath = getGatewayConformanceBinaryPath()
    before(async () => {
      const log = logger.forComponent('before')
      if (process.env.GATEWAY_CONFORMANCE_BINARY != null) {
        log('Using custom gateway-conformance binary at %s', binaryPath)
        return
      }
      const gwcVersion = GWC_IMAGE.split(':').pop()
      const { stdout, stderr } = await execa('go', ['install', `github.com/ipfs/gateway-conformance/cmd/gateway-conformance@${gwcVersion}`], { reject: true })
      log(stdout)
      log.error(stderr)
    })

    after(async () => {
      const log = logger.forComponent('after')

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
    })

    /**
     * You can see what the latest success rate, passing tests, and failing tests are by running the following command:
     *
     * ```
     * DEBUG="gateway-conformance*,gateway-conformance*:trace" SUCCESS_RATE=100 npm run test -- --bail false
     * ```
     */
    describe('gateway conformance', function () {
      this.timeout(200000)
      let successRate: number
      let failingTests: string[]
      let passingTests: string[]
      const log = logger.forComponent('output:all')

      before(async function () {
        const testsToSkip: string[] = getTestsToSkip()
        const testsToRun: string[] = getTestsToRun()
        const cancelSignal = AbortSignal.timeout(200000)
        const { stderr, stdout } = await execa(binaryPath, getConformanceTestArgs('all', [], [
          ...(testsToRun.length > 0 ? ['-run', `${testsToRun.join('|')}`] : []),
          ...(testsToSkip.length > 0 ? ['-skip', `${testsToSkip.join('|')}`] : [])
        ]), { reject: false, cancelSignal })

        expect(cancelSignal.aborted).to.be.false()

        log(stdout)
        log.error(stderr)
        await expect(access('gwc-report-all.json', constants.R_OK)).to.eventually.be.fulfilled()
        const results = await getReportDetails('gwc-report-all.json')
        successRate = results.successRate
        failingTests = results.failingTests
        passingTests = results.passingTests
        log.trace('Passing tests:')
        passingTests.forEach((test) => { log.trace(`PASS: ${test}`) })
        log.trace('Failing tests:')
        failingTests.forEach((test) => { log.trace(`FAIL: ${test}`) })
      })

      for (const test of expectedPassingTests) {
        // eslint-disable-next-line no-loop-func
        it(`${test} Passes as expected`, () => {
          expect(passingTests).to.include(test)
        })
      }

      for (const test of expectedFailingTests) {
        // eslint-disable-next-line no-loop-func
        it(`${test} Fails as expected`, () => {
          expect(failingTests).to.include(test)
        })
      }

      const knownSuccessRate = 46.01
      it(`has expected success rate of ${knownSuccessRate}%`, () => {
        // check latest success rate with `SUCCESS_RATE=100 npm run test -- -g 'total'`
        const expectedSuccessRate = process.env.SUCCESS_RATE != null ? Number.parseFloat(process.env.SUCCESS_RATE) : knownSuccessRate
        expect(successRate).to.be.greaterThanOrEqual(expectedSuccessRate)
      })
    })
  })
})
