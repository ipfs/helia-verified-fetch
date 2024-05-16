/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-env mocha */
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { prefixLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { execa } from 'execa'
import { Agent, setGlobalDispatcher } from 'undici'

const logger = prefixLogger('conformance-tests')

interface TestConfig {
  name: string
  spec?: string
  skip?: string[]
  run?: string[]
  successRate: number
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
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    `--gateway-url=http://${process.env.CONFORMANCE_HOST!}:${process.env.PROXY_PORT!}`,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    `--subdomain-url=http://${process.env.CONFORMANCE_HOST!}:${process.env.PROXY_PORT!}`,
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
    successRate: 35.38
  },
  {
    name: 'TestPlainCodec',
    run: ['TestPlainCodec'],
    successRate: 39.86
  },
  {
    name: 'TestPathing',
    run: ['TestPathing'],
    successRate: 23.53
  },
  {
    name: 'TestDNSLinkGatewayUnixFSDirectoryListing',
    run: ['TestDNSLinkGatewayUnixFSDirectoryListing'],
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
    successRate: 44.44
  },
  // currently results in an infinite loop without verified-fetch stopping the request whether sessions are enabled or not.
  // {
  //   name: 'TestNativeDag',
  //   run: ['TestNativeDag'],
  //   successRate: 100
  // },
  {
    name: 'TestGatewayJSONCborAndIPNS',
    run: ['TestGatewayJSONCborAndIPNS'],
    successRate: 24.24
  },
  {
    name: 'TestGatewayIPNSPath',
    run: ['TestGatewayIPNSPath'],
    successRate: 27.27
  },
  {
    name: 'TestRedirectCanonicalIPNS',
    run: ['TestRedirectCanonicalIPNS'],
    successRate: 0
  },
  {
    name: 'TestGatewayBlock',
    run: ['TestGatewayBlock'],
    successRate: 37.93
  },
  {
    name: 'TestTrustlessRawRanges',
    run: ['TestTrustlessRawRanges'],
    successRate: 75
  },
  {
    name: 'TestTrustlessRaw',
    run: ['TestTrustlessRaw'],
    successRate: 55.56
  },
  {
    name: 'TestGatewayIPNSRecord',
    run: ['TestGatewayIPNSRecord'],
    successRate: 0
  },
  {
    name: 'TestTrustlessCarOrderAndDuplicates',
    run: ['TestTrustlessCarOrderAndDuplicates'],
    successRate: 13.79
  },
  // times out
  // {
  //   name: 'TestTrustlessCarEntityBytes',
  //   run: ['TestTrustlessCarEntityBytes'],
  //   successRate: 100
  // },
  {
    name: 'TestTrustlessCarDagScopeAll',
    run: ['TestTrustlessCarDagScopeAll'],
    successRate: 36.36
  },
  {
    name: 'TestTrustlessCarDagScopeEntity',
    run: ['TestTrustlessCarDagScopeEntity'],
    successRate: 34.57
  },
  {
    name: 'TestTrustlessCarDagScopeBlock',
    run: ['TestTrustlessCarDagScopeBlock'],
    successRate: 34.69
  },
  {
    name: 'TestTrustlessCarPathing',
    run: ['TestTrustlessCarPathing'],
    successRate: 33.85
  },
  {
    name: 'TestSubdomainGatewayDNSLinkInlining',
    run: ['TestSubdomainGatewayDNSLinkInlining'],
    successRate: 0
  },
  {
    name: 'TestGatewaySubdomainAndIPNS',
    run: ['TestGatewaySubdomainAndIPNS'],
    successRate: 0
  },
  {
    name: 'TestGatewaySubdomains',
    run: ['TestGatewaySubdomains'],
    successRate: 7.17
  },
  // times out
  // {
  //   name: 'TestUnixFSDirectoryListingOnSubdomainGateway',
  //   run: ['TestUnixFSDirectoryListingOnSubdomainGateway'],
  //   successRate: 100
  // },
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
    successRate: 2.33
  },
  {
    name: 'TestPathGatewayMiscellaneous',
    run: ['TestPathGatewayMiscellaneous'],
    successRate: 100
  },
  {
    name: 'TestGatewayUnixFSFileRanges',
    run: ['TestGatewayUnixFSFileRanges'],
    successRate: 40
  },
  {
    name: 'TestGatewaySymlink',
    run: ['TestGatewaySymlink'],
    successRate: 33.33
  },
  {
    name: 'TestGatewayCacheWithIPNS',
    run: ['TestGatewayCacheWithIPNS'],
    successRate: 35.71
  },
  // times out
  // {
  //   name: 'TestGatewayCache',
  //   run: ['TestGatewayCache'],
  //   successRate: 100
  // },
  // times out
  // {
  //   name: 'TestUnixFSDirectoryListing',
  //   run: ['TestUnixFSDirectoryListing'],
  //   successRate: 100
  // },
  {
    name: 'TestTar',
    run: ['TestTar'],
    successRate: 50
  }
]

async function getReportDetails (path: string) {
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
    if (process.env.PROXY_PORT == null) {
      throw new Error('PROXY_PORT env var is required')
    }
    if (process.env.SERVER_PORT == null) {
      throw new Error('SERVER_PORT env var is required')
    }
    if (process.env.CONFORMANCE_HOST == null) {
      throw new Error('CONFORMANCE_HOST env var is required')
    }
    // see https://stackoverflow.com/questions/71074255/use-custom-dns-resolver-for-any-request-in-nodejs
    // EVERY undici/fetch request host resolves to local IP. Node.js does not resolve reverse-proxy requests properly
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
      ['proxy server path request works', `http://localhost:${process.env.PROXY_PORT}/ipfs/bafkqabtimvwgy3yk`],
      ['basic server subdomain request works', `http://bafkqabtimvwgy3yk.ipfs.localhost:${process.env.SERVER_PORT}`],
      ['proxy server subdomain request works', `http://bafkqabtimvwgy3yk.ipfs.localhost:${process.env.PROXY_PORT}`]
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
      try {
        await execa('rm', [binaryPath])
        log('gateway-conformance binary successfully uninstalled.')
      } catch (error) {
        log.error(`Error removing "${binaryPath}"`, error)
      }
    })

    tests.forEach(({ name, spec, skip, run, successRate: minSuccessRate }) => {
      const log = logger.forComponent(name)
      const expectedSuccessRate = process.env.SUCCESS_RATE ? Number.parseFloat(process.env.SUCCESS_RATE) : minSuccessRate

      it(`${name} has a success rate of at least ${expectedSuccessRate}%`, async function () {
        const { stderr, stdout } = await execa(binaryPath, getConformanceTestArgs(name,
          [
            ...(spec != null ? ['--specs', spec] : [])
          ],
          [
            ...((skip != null) ? ['-skip', `${skip.join('|')}`] : []),
            ...((run != null) ? ['-run', `${run.join('|')}`] : [])
          ]
        ), { reject: false })

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
      const log = logger.forComponent('all')

      // TODO: unskip when verified-fetch is no longer infinitely looping on requests.
      const toSkip = [
        'TestNativeDag',
        'TestTrustlessCarEntityBytes',
        'TestUnixFSDirectoryListingOnSubdomainGateway',
        'TestGatewayCache',
        'TestUnixFSDirectoryListing'
      ]

      const { stderr, stdout } = await execa(binaryPath, getConformanceTestArgs('all', [], ['-skip', toSkip.join('|')]), { reject: false })

      log(stdout)
      log.error(stderr)

      const { failureCount, successCount, successRate } = await getReportDetails('gwc-report-all.json')

      expect(failureCount).to.be.lessThanOrEqual(1134)
      expect(successCount).to.be.greaterThanOrEqual(262)
      expect(successRate).to.be.greaterThanOrEqual(18.77)
    })
  })
})
