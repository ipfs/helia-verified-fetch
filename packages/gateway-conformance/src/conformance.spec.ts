/* eslint-env mocha */
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { prefixLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { execa } from 'execa'
import { Agent, setGlobalDispatcher } from 'undici'

const logger = prefixLogger('gateway-conformance')

interface TestConfig {
  name: string
  spec?: string
  skip?: string[]
  run?: string[]
  successRate: number
  timeout?: number
}

function getGatewayConformanceBinaryPath (): string {
  if (process.env.GATEWAY_CONFORMANCE_BINARY != null) {
    return process.env.GATEWAY_CONFORMANCE_BINARY
  }
  const goPath = process.env.GOPATH ?? join(homedir(), 'go', 'bin')
  return join(goPath, 'gateway-conformance')
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

/**
 * You can see what the latest success rates are by running the following command:
 *
 * ```
 * cd ../../ && npm run build && cd packages/gateway-conformance && SUCCESS_RATE=100 npm run test -- --bail false
 * ```
 */
const tests: TestConfig[] = [
  {
    name: 'TestMetadata',
    run: ['TestMetadata'],
    successRate: 100
  },
  {
    name: 'TestDagPbConversion',
    run: ['TestDagPbConversion'],
    successRate: 26.15
  },
  {
    name: 'TestPlainCodec',
    run: ['TestPlainCodec'],
    successRate: 39.86
  },
  {
    name: 'TestPathing',
    run: ['TestPathing'],
    successRate: 40
  },
  {
    name: 'TestDNSLinkGatewayUnixFSDirectoryListing',
    run: ['TestDNSLinkGatewayUnixFSDirectoryListing'],
    skip: [
      'TestDNSLinkGatewayUnixFSDirectoryListing/.*TODO:_cleanup_Kubo-specifics'
    ],
    successRate: 0
  },
  {
    name: 'TestCors',
    run: ['TestCors'],
    successRate: 0
  },
  {
    name: 'TestGatewayJsonCbor',
    run: ['TestGatewayJsonCbor'],
    successRate: 22.22
  },
  {
    name: 'TestNativeDag',
    run: ['TestNativeDag'],
    successRate: 60.71
  },
  {
    name: 'TestGatewayJSONCborAndIPNS',
    run: ['TestGatewayJSONCborAndIPNS'],
    successRate: 51.52
  },
  {
    name: 'TestGatewayIPNSPath',
    run: ['TestGatewayIPNSPath'],
    successRate: 100
  },
  {
    name: 'TestRedirectCanonicalIPNS',
    run: ['TestRedirectCanonicalIPNS'],
    successRate: 0
  },
  {
    name: 'TestGatewayBlock',
    run: ['TestGatewayBlock'],
    successRate: 20.69
  },
  {
    name: 'TestTrustlessRawRanges',
    run: ['TestTrustlessRawRanges'],
    successRate: 75
  },
  {
    name: 'TestTrustlessRaw',
    run: ['TestTrustlessRaw'],
    skip: ['TestTrustlessRawRanges'],
    successRate: 70.83
  },
  {
    name: 'TestGatewayIPNSRecord',
    run: ['TestGatewayIPNSRecord'],
    successRate: 17.39
  },
  {
    name: 'TestTrustlessCarOrderAndDuplicates',
    run: ['TestTrustlessCarOrderAndDuplicates'],
    successRate: 44.83
  },
  // {
  //   // currently timing out
  //   name: 'TestTrustlessCarEntityBytes',
  //   run: ['TestTrustlessCarEntityBytes'],
  //   successRate: 100
  // },
  {
    name: 'TestTrustlessCarDagScopeAll',
    run: ['TestTrustlessCarDagScopeAll'],
    successRate: 54.55
  },
  // {
  //   // currently timing out
  //   name: 'TestTrustlessCarDagScopeEntity',
  //   run: ['TestTrustlessCarDagScopeEntity'],
  //   successRate: 34.57
  // },
  // {
  //   // currently timing out
  //   name: 'TestTrustlessCarDagScopeBlock',
  //   run: ['TestTrustlessCarDagScopeBlock'],
  //   successRate: 34.69
  // },
  // {
  //   // passes at the set successRate, but takes incredibly long (consistently ~2m).. disabling for now.
  //   name: 'TestTrustlessCarPathing',
  //   run: ['TestTrustlessCarPathing'],
  //   successRate: 35,
  //   timeout: 130000
  // },
  // {
  //   // currently timing out
  //   name: 'TestSubdomainGatewayDNSLinkInlining',
  //   run: ['TestSubdomainGatewayDNSLinkInlining'],
  //   successRate: 100
  // },
  {
    name: 'TestGatewaySubdomainAndIPNS',
    run: ['TestGatewaySubdomainAndIPNS'],
    successRate: 31.58
  },
  {
    // TODO: add directory listing support to verified-fetch
    name: 'TestGatewaySubdomains',
    run: [
      'TestGatewaySubdomains'
    ],
    skip: [
      'TestGatewaySubdomains/.*HTTP_proxy_tunneling_via_CONNECT' // verified fetch should not be doing HTTP proxy tunneling.
    ],
    successRate: 41.35
  },
  {
    name: 'TestUnixFSDirectoryListingOnSubdomainGateway',
    run: ['TestUnixFSDirectoryListingOnSubdomainGateway'],
    successRate: 10.26
  },
  {
    name: 'TestRedirectsFileWithIfNoneMatchHeader',
    run: ['TestRedirectsFileWithIfNoneMatchHeader'],
    successRate: 0
  },
  {
    name: 'TestRedirectsFileSupportWithDNSLink',
    run: ['TestRedirectsFileSupportWithDNSLink'],
    successRate: 26.09
  },
  {
    name: 'TestRedirectsFileSupport',
    run: ['TestRedirectsFileSupport'],
    skip: ['TestRedirectsFileSupportWithDNSLink'],
    successRate: 0
  },
  {
    name: 'TestPathGatewayMiscellaneous',
    run: ['TestPathGatewayMiscellaneous'],
    successRate: 100
  },
  {
    name: 'TestGatewayUnixFSFileRanges',
    run: ['TestGatewayUnixFSFileRanges'],
    successRate: 46.67
  },
  {
    name: 'TestGatewaySymlink',
    run: ['TestGatewaySymlink'],
    successRate: 33.33
  },
  {
    name: 'TestGatewayCacheWithIPNS',
    run: ['TestGatewayCacheWithIPNS'],
    successRate: 66.67
  },
  // {
  //   // passes at the set successRate, but takes incredibly long (consistently ~2m).. disabling for now.
  //   name: 'TestGatewayCache',
  //   run: ['TestGatewayCache'],
  //   skip: ['TestGatewayCacheWithIPNS'],
  //   successRate: 59.38,
  //   timeout: 1200000
  // },
  {
    name: 'TestUnixFSDirectoryListing',
    run: ['TestUnixFSDirectoryListing'],
    skip: [
      'TestUnixFSDirectoryListingOnSubdomainGateway',
      'TestUnixFSDirectoryListing/.*TODO:_cleanup_Kubo-specifics'
    ],
    successRate: 50,
    timeout: 1200000
  },
  {
    name: 'TestTar',
    run: ['TestTar'],
    successRate: 62.5
  }
]

async function getReportDetails (path: string): Promise<{ failureCount: number, successCount: number, successRate: number }> {
  let failureCount = 0
  let successCount = 0

  // parse the newline delimited JSON report at gwc-report-${name}.json and count the number of "PASS:" and "FAIL:" lines
  const report = await readFile(path, 'utf8')
  const lines = report.split('\n')
  for (const line of lines) {
    if (line.includes('--- FAIL:')) {
      failureCount++
    } else if (line.includes('--- PASS:')) {
      successCount++
    }
  }
  const successRate = Number.parseFloat(((successCount / (successCount + failureCount)) * 100).toFixed(2))

  return {
    failureCount,
    successCount,
    successRate
  }
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
      const { stdout, stderr } = await execa('go', ['install', 'github.com/ipfs/gateway-conformance/cmd/gateway-conformance@latest'], { reject: true })
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

    tests.forEach(({ name, spec, skip, run, timeout, successRate: minSuccessRate }) => {
      const log = logger.forComponent(`output:${name}`)
      const expectedSuccessRate = process.env.SUCCESS_RATE != null ? Number.parseFloat(process.env.SUCCESS_RATE) : minSuccessRate

      it(`${name} has a success rate of at least ${expectedSuccessRate}%`, async function () {
        if (timeout != null) {
          this.timeout(timeout)
        }

        const { stderr, stdout } = await execa(binaryPath, getConformanceTestArgs(name,
          [
            ...(spec != null ? ['--specs', spec] : [])
          ],
          [
            ...((skip != null) ? ['-skip', `${skip.join('|')}`] : []),
            ...((run != null) ? ['-run', `${run.join('|')}`] : [])
          ]
        ), { reject: false, cancelSignal: timeout != null ? AbortSignal.timeout(timeout) : undefined })

        log(stdout)
        log.error(stderr)

        const { successRate } = await getReportDetails(`gwc-report-${name}.json`)
        expect(successRate).to.be.greaterThanOrEqual(expectedSuccessRate)
      })
    })

    /**
     * This test ensures new or existing gateway-conformance tests that fail are caught and addressed appropriately.
     * Eventually, we will not need the `tests.forEach` tests and can just run all the recommended tests directly,
     * as this test does.
     */
    it('has expected total failures and successes', async function () {
      this.timeout(200000)
      const log = logger.forComponent('output:all')

      const { stderr, stdout } = await execa(binaryPath, getConformanceTestArgs('all', [], []), { reject: false, cancelSignal: AbortSignal.timeout(200000) })

      log(stdout)
      log.error(stderr)

      const { successRate } = await getReportDetails('gwc-report-all.json')
      const knownSuccessRate = 42.47
      // check latest success rate with `SUCCESS_RATE=100 npm run test -- -g 'total'`
      const expectedSuccessRate = process.env.SUCCESS_RATE != null ? Number.parseFloat(process.env.SUCCESS_RATE) : knownSuccessRate

      expect(successRate).to.be.greaterThanOrEqual(expectedSuccessRate)
    })
  })
})
