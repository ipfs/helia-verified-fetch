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
  maxFailures: number
  minimumSuccesses?: number
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

const tests: TestConfig[] = [
  {
    name: 'TestMetadata',
    run: ['TestMetadata'],
    maxFailures: 0,
    minimumSuccesses: 1
  },
  {
    name: 'TestDagPbConversion',
    run: ['TestDagPbConversion'],
    maxFailures: 51,
    minimumSuccesses: 14
  },
  {
    name: 'TestPlainCodec',
    run: ['TestPlainCodec'],
    maxFailures: 83,
    minimumSuccesses: 15
  },
  {
    name: 'TestPathing',
    run: ['TestPathing'],
    maxFailures: 13,
    minimumSuccesses: 0
  },
  {
    name: 'TestDNSLinkGatewayUnixFSDirectoryListing',
    run: ['TestDNSLinkGatewayUnixFSDirectoryListing'],
    maxFailures: 20,
    minimumSuccesses: 0
  },
  {
    name: 'TestCors',
    run: ['TestCors'],
    maxFailures: 11,
    minimumSuccesses: 0
  },
  {
    name: 'TestGatewayJsonCbor',
    run: ['TestGatewayJsonCbor'],
    maxFailures: 9,
    minimumSuccesses: 0
  },
  // currently results in an infinite loop without verified-fetch stopping the request whether sessions are enabled or not.
  // {
  //   name: 'TestNativeDag',
  //   run: ['TestNativeDag'],
  //   maxFailures: 2,
  //   minimumSuccesses: 0
  // },
  {
    name: 'TestGatewayJSONCborAndIPNS',
    run: ['TestGatewayJSONCborAndIPNS'],
    maxFailures: 25,
    minimumSuccesses: 8
  },
  {
    name: 'TestGatewayIPNSPath',
    run: ['TestGatewayIPNSPath'],
    maxFailures: 8,
    minimumSuccesses: 3
  },
  {
    name: 'TestRedirectCanonicalIPNS',
    run: ['TestRedirectCanonicalIPNS'],
    maxFailures: 7,
    minimumSuccesses: 0
  },
  {
    name: 'TestGatewayBlock',
    run: ['TestGatewayBlock'],
    maxFailures: 25,
    minimumSuccesses: 4
  },
  {
    name: 'TestTrustlessRawRanges',
    run: ['TestTrustlessRawRanges'],
    maxFailures: 5,
    minimumSuccesses: 7
  },
  {
    name: 'TestTrustlessRaw',
    run: ['TestTrustlessRaw'],
    maxFailures: 29,
    minimumSuccesses: 7
  },
  {
    name: 'TestGatewayIPNSRecord',
    run: ['TestGatewayIPNSRecord'],
    maxFailures: 23,
    minimumSuccesses: 0
  },
  {
    name: 'TestTrustlessCarOrderAndDuplicates',
    run: ['TestTrustlessCarOrderAndDuplicates'],
    maxFailures: 26,
    minimumSuccesses: 3
  },
  // times out
  // {
  //   name: 'TestTrustlessCarEntityBytes',
  //   run: ['TestTrustlessCarEntityBytes'],
  //   maxFailures: 122,
  //   minimumSuccesses: 55
  // },
  {
    name: 'TestTrustlessCarDagScopeAll',
    run: ['TestTrustlessCarDagScopeAll'],
    maxFailures: 23,
    minimumSuccesses: 10
  },
  {
    name: 'TestTrustlessCarDagScopeEntity',
    run: ['TestTrustlessCarDagScopeEntity'],
    maxFailures: 56,
    minimumSuccesses: 25
  },
  {
    name: 'TestTrustlessCarDagScopeBlock',
    run: ['TestTrustlessCarDagScopeBlock'],
    maxFailures: 34,
    minimumSuccesses: 15
  },
  {
    name: 'TestTrustlessCarPathing',
    run: ['TestTrustlessCarPathing'],
    maxFailures: 45,
    minimumSuccesses: 20
  },
  {
    name: 'TestSubdomainGatewayDNSLinkInlining',
    run: ['TestSubdomainGatewayDNSLinkInlining'],
    maxFailures: 41,
    minimumSuccesses: 0
  },
  {
    name: 'TestGatewaySubdomainAndIPNS',
    run: ['TestGatewaySubdomainAndIPNS'],
    maxFailures: 95,
    minimumSuccesses: 0
  },
  {
    name: 'TestGatewaySubdomains',
    run: ['TestGatewaySubdomains'],
    maxFailures: 279,
    minimumSuccesses: 0
  },
  // times out
  // {
  //   name: 'TestUnixFSDirectoryListingOnSubdomainGateway',
  //   run: ['TestUnixFSDirectoryListingOnSubdomainGateway'],
  //   maxFailures: 39,
  //   minimumSuccesses: 0
  // },
  {
    name: 'TestRedirectsFileWithIfNoneMatchHeader',
    run: ['TestRedirectsFileWithIfNoneMatchHeader'],
    maxFailures: 15,
    minimumSuccesses: 0
  },
  {
    name: 'TestRedirectsFileSupportWithDNSLink',
    run: ['TestRedirectsFileSupportWithDNSLink'],
    maxFailures: 17,
    minimumSuccesses: 6
  },
  {
    name: 'TestRedirectsFileSupport',
    run: ['TestRedirectsFileSupport'],
    maxFailures: 252,
    minimumSuccesses: 6
  },
  {
    name: 'TestPathGatewayMiscellaneous',
    run: ['TestPathGatewayMiscellaneous'],
    maxFailures: 3,
    minimumSuccesses: 0
  },
  {
    name: 'TestGatewayUnixFSFileRanges',
    run: ['TestGatewayUnixFSFileRanges'],
    maxFailures: 10,
    minimumSuccesses: 5
  },
  {
    name: 'TestGatewaySymlink',
    run: ['TestGatewaySymlink'],
    maxFailures: 9,
    minimumSuccesses: 0
  },
  {
    name: 'TestGatewayCacheWithIPNS',
    run: ['TestGatewayCacheWithIPNS'],
    maxFailures: 27,
    minimumSuccesses: 15
  },
  // times out
  // {
  //   name: 'TestGatewayCache',
  //   run: ['TestGatewayCache'],
  //   maxFailures: 71,
  //   minimumSuccesses: 23
  // },
  // times out
  // {
  //   name: 'TestUnixFSDirectoryListing',
  //   run: ['TestUnixFSDirectoryListing'],
  //   maxFailures: 50,
  //   minimumSuccesses: 0
  // },
  {
    name: 'TestTar',
    run: ['TestTar'],
    maxFailures: 16,
    minimumSuccesses: 8
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

    tests.forEach(({ name, spec, skip, run, maxFailures, minimumSuccesses }) => {
      const log = logger.forComponent(name)

      it(`has no more than ${maxFailures} failing tests for ${name}`, async function () {
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
      // CI has 1134 failures, but I get 1129 locally.
      expect(failureCount).to.be.lessThanOrEqual(1134)
      expect(successCount).to.be.greaterThanOrEqual(262)
    })
  })
})
