/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-env mocha */
import { readFile } from 'node:fs/promises'
import { prefixLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { execa } from 'execa'
import { Agent, setGlobalDispatcher } from 'undici'
import { GWC_IMAGE } from './constants.js'

const logger = prefixLogger('conformance-tests')

interface TestConfig {
  name: string
  spec?: string
  skip?: string[]
  run?: string[]
  maxFailures: number
  minimumSuccesses?: number
}

function getConformanceTestArgs (name: string, gwcArgs: string[] = [], goTestArgs: string[] = []): string[] {
  return [
    'run',
    /**
     * Ensure new containers aren't created as this can quickly result in exceeding allowed docker storage.
     * Also, creating a new container for each test significantly slows things down.
     */
    '--name', 'gateway-conformance',
    '--network',
    'host',
    '-v',
      `${process.cwd()}:/workspace`,
      '-w',
      '/workspace',
      GWC_IMAGE,
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

const tests: TestConfig[] = [
  {
    // passing tests should be added here.
    name: 'TestMetadata',
    run: ['TestMetadata'],
    maxFailures: 0
  },
  {
    name: 'TestDagPbConversion',
    run: ['TestDagPbConversion'],
    maxFailures: 51
  },
  {
    name: 'TestPlainCodec',
    run: ['TestPlainCodec'],
    maxFailures: 44
  },
  {
    name: 'TestPathing',
    run: ['TestPathing'],
    maxFailures: 5
  },
  {
    name: 'TestDNSLinkGatewayUnixFSDirectoryListing',
    run: ['TestDNSLinkGatewayUnixFSDirectoryListing'],
    maxFailures: 20
  },
  {
    name: 'TestCors',
    run: ['TestCors'],
    maxFailures: 10
  },
  {
    name: 'TestGatewayJsonCbor',
    run: ['TestGatewayJsonCbor'],
    maxFailures: 9
  },
  {
    name: 'TestNativeDag',
    run: ['TestNativeDag'],
    maxFailures: 2
  },
  {
    name: 'TestGatewayJSONCborAndIPNS',
    run: ['TestGatewayJSONCborAndIPNS'],
    maxFailures: 25
  },
  {
    name: 'TestGatewayIPNSPath',
    run: ['TestGatewayIPNSPath'],
    maxFailures: 8
  },
  {
    name: 'TestRedirectCanonicalIPNS',
    run: ['TestRedirectCanonicalIPNS'],
    maxFailures: 7
  },
  {
    name: 'TestGatewayBlock',
    run: ['TestGatewayBlock'],
    maxFailures: 25
  },
  {
    name: 'TestTrustlessRawRanges',
    run: ['TestTrustlessRawRanges'],
    maxFailures: 5
  },
  {
    name: 'TestTrustlessRaw',
    run: ['TestTrustlessRaw'],
    maxFailures: 29
  },
  {
    name: 'TestGatewayIPNSRecord',
    run: ['TestGatewayIPNSRecord'],
    maxFailures: 23
  },
  {
    name: 'TestTrustlessCarOrderAndDuplicates',
    run: ['TestTrustlessCarOrderAndDuplicates'],
    maxFailures: 26
  },
  {
    name: 'TestTrustlessCarEntityBytes',
    run: ['TestTrustlessCarEntityBytes'],
    maxFailures: 122
  },
  {
    name: 'TestTrustlessCarDagScopeAll',
    run: ['TestTrustlessCarDagScopeAll'],
    maxFailures: 23
  },
  {
    name: 'TestTrustlessCarDagScopeEntity',
    run: ['TestTrustlessCarDagScopeEntity'],
    maxFailures: 56
  },
  {
    name: 'TestTrustlessCarDagScopeBlock',
    run: ['TestTrustlessCarDagScopeBlock'],
    maxFailures: 34
  },
  {
    name: 'TestTrustlessCarPathing',
    run: ['TestTrustlessCarPathing'],
    maxFailures: 45
  },
  {
    name: 'TestSubdomainGatewayDNSLinkInlining',
    run: ['TestSubdomainGatewayDNSLinkInlining'],
    maxFailures: 41
  },
  {
    name: 'TestGatewaySubdomainAndIPNS',
    run: ['TestGatewaySubdomainAndIPNS'],
    maxFailures: 95
  },
  {
    name: 'TestGatewaySubdomains',
    run: ['TestGatewaySubdomains'],
    maxFailures: 279
  },
  {
    name: 'TestUnixFSDirectoryListingOnSubdomainGateway',
    run: ['TestUnixFSDirectoryListingOnSubdomainGateway'],
    maxFailures: 39
  },
  {
    name: 'TestRedirectsFileWithIfNoneMatchHeader',
    run: ['TestRedirectsFileWithIfNoneMatchHeader'],
    maxFailures: 15
  },
  {
    name: 'TestRedirectsFileSupportWithDNSLink',
    run: ['TestRedirectsFileSupportWithDNSLink'],
    maxFailures: 17
  },
  {
    name: 'TestRedirectsFileSupport',
    run: ['TestRedirectsFileSupport'],
    maxFailures: 252
  },
  {
    name: 'TestPathGatewayMiscellaneous',
    run: ['TestPathGatewayMiscellaneous'],
    maxFailures: 3
  },
  {
    name: 'TestGatewayUnixFSFileRanges',
    run: ['TestGatewayUnixFSFileRanges'],
    maxFailures: 10
  },
  {
    name: 'TestGatewaySymlink',
    run: ['TestGatewaySymlink'],
    maxFailures: 9
  },
  {
    name: 'TestGatewayCacheWithIPNS',
    run: ['TestGatewayCacheWithIPNS'],
    maxFailures: 27
  },
  {
    name: 'TestGatewayCache',
    run: ['TestGatewayCache'],
    maxFailures: 71
  },
  {
    name: 'TestUnixFSDirectoryListing',
    run: ['TestUnixFSDirectoryListing'],
    maxFailures: 50
  },
  {
    name: 'TestTar',
    run: ['TestTar'],
    maxFailures: 16
  }
]

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
    tests.forEach(({ name, spec, skip, run, maxFailures, minimumSuccesses }) => {
      const log = logger.forComponent(name)

      it(`has no more than ${maxFailures} failing tests for ${name}`, async function () {
        // 5 seconds per test group
        this.timeout(5 * 1000)
        /**
         * TODO: move to using gateway-conformance binary directly?
         *
         * Install with:
         * go install github.com/ipfs/gateway-conformance/cmd/gateway-conformance@latest
         *
         * And then run with:
         */
        // $HOME/go/bin/gateway-conformance test --gateway-url=http://localhost:3441 --subdomain-url=http://localhost:3442 --verbose --json gwc-report-direct.json -- -skip '.*/.*TODO.*|TestDagPbConversion.*|TestPlainCodec.*|TestPathing.*|TestDNSLinkGatewayUnixFSDirectoryListing|TestCors|TestGatewayJsonCbor|TestNativeDag|TestGatewayJSONCborAndIPNS|TestGatewayIPNSPath|TestRedirectCanonicalIPNS|TestGatewayBlock|TestTrustlessRawRanges|TestTrustlessRaw|TestGatewayIPNSRecord|TestTrustlessCarOrderAndDuplicates|TestTrustlessCarEntityBytes|TestTrustlessCarDagScopeAll|TestTrustlessCarDagScopeEntity|TestTrustlessCarDagScopeBlock|TestTrustlessCarPathing|TestSubdomainGatewayDNSLinkInlining|TestGatewaySubdomainAndIPNS|TestGatewaySubdomains|TestUnixFSDirectoryListingOnSubdomainGateway|TestRedirectsFileWithIfNoneMatchHeader|TestRedirectsFileSupportWithDNSLink|TestRedirectsFileSupport|TestPathGatewayMiscellaneous|TestGatewayUnixFSFileRanges|TestGatewaySymlink|TestGatewayCacheWithIPNS|TestGatewayCache|TestUnixFSDirectoryListing|TestTar'
        const { stderr, stdout } = await execa('docker', getConformanceTestArgs(name,
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

        let failureCount = 0
        let successCount = 0

        // parse the newline delimited JSON report at gwc-report-${name}.json and count the number of "PASS:" and "FAIL:" lines
        const report = await readFile(`gwc-report-${name}.json`, 'utf8')
        const lines = report.split('\n')
        for (const line of lines) {
          if (line.includes('--- FAIL:')) {
            failureCount++
          } else if (line.includes('--- PASS:')) {
            successCount++
          }
        }

        expect(failureCount).to.be.lessThanOrEqual(maxFailures)
        expect(successCount).to.be.greaterThanOrEqual(minimumSuccesses ?? 0)
      })
    })

    /**
     * This test ensures new or existing gateway-conformance tests that fail are caught and addressed appropriately.
     * Eventually, we will not need the `tests.forEach` tests and can just run all the recommended tests directly,
     * as this test does.
     */
    it('has expected total failures and successes', async function () {
      this.timeout(15 * 1000)
      const log = logger.forComponent('all')

      // get total maxFailures from `tests`
      const totalMaxFailures = tests.reduce((acc, { maxFailures }) => acc + maxFailures, 0)

      const { stderr, stdout } = await execa('docker', getConformanceTestArgs('all'), { reject: false })

      log(stdout)
      log.error(stderr)
      let failureCount = 0
      let successCount = 0

      // parse the newline delimited JSON report at gwc-report-${name}.json and count the number of "PASS:" and "FAIL:" lines
      const report = await readFile('gwc-report-all.json', 'utf8')
      const lines = report.split('\n')
      for (const line of lines) {
        if (line.includes('--- FAIL:')) {
          failureCount++
        } else if (line.includes('--- PASS:')) {
          successCount++
        }
      }

      expect(failureCount).to.be.lessThanOrEqual(totalMaxFailures)
      expect(successCount).to.be.greaterThanOrEqual(31)
    })
  })
})
