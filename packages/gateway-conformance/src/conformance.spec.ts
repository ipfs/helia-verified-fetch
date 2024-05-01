/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-env mocha */
import { readFile } from 'node:fs/promises'
import { expect } from 'aegir/chai'
import { execa } from 'execa'
import { Agent, setGlobalDispatcher } from 'undici'

// TODO: skipping tests is a PITA. Need gateway-conformance changes before we can actually iterate on this reasonably.
// See https://github.com/ipfs/gateway-conformance/issues/201 for more information.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment, @typescript-eslint/prefer-ts-expect-error
// @ts-ignore - May be unused while debugging
const testsToSkip: string[] = [
  'TestPlainCodec',
  'TestGatewayJsonCbor.*Header_Content-Type',
  'TestGatewayJsonCbor/.*/Body',
  'TestDNSLinkGatewayUnixFSDirectoryListing.*Body',
  '.*TODO.*'
  // 'TestPlainCodec.*/Check_0',
  // 'TestPlainCodec/.*/Check_0',
  // 'TestPlainCodec.*/Check_0/Header_Content-Disposition',
  // '.*Header_Content-Disposition.*'
]

// eslint-disable-next-line @typescript-eslint/ban-ts-comment, @typescript-eslint/prefer-ts-expect-error
// @ts-ignore - May be unused while debugging
const testsToRun: string[] = [
  // 'TestDagPbConversion',
  'TestMetadata' // since we're only running 'TestMetadata', nothing else is currently being ran.
  // 'TestGatewayJsonCbor',
  // 'TestGatewayJsonCbor.*Status_code',
  // 'TestDagPbConversion/.*/Header_Content-Type#01',
  // 'TestPlainCodec.*/Check_1'
  // 'TestPlainCodec'
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

  function getConformanceTestArgs (specToTest: string, additionalArgs: string[] = []): string[] {
    return [
      'run',
      '--network',
      'host',
      '-v',
      `${process.cwd()}:/workspace`,
      '-w',
      '/workspace',
      'ghcr.io/ipfs/gateway-conformance:v0.5.1',
      'test',
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      `--gateway-url=http://${process.env.CONFORMANCE_HOST!}:${process.env.PROXY_PORT!}`,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      `--subdomain-url=http://${process.env.CONFORMANCE_HOST!}:${process.env.PROXY_PORT!}`,
      '--verbose',
      '--json', `gwc-report-${specToTest}.json`,
      '-specs', specToTest,
      '--',
      '-timeout', '30m',
      // `-run=(${testsToRun.join('|')})`,
      // '-skip', `"(${testsToSkip.join('|')})"`
      ...additionalArgs
    ]
  }

  describe('conformance testing', () => {
    const specs: Array<[string, number]> = [
      ['trustless-block-gateway', 1],
      ['trustless-car-gateway', 1],
      ['trustless-car-gateway-optional', 1],
      ['trustless-ipns-gateway', 1],
      ['trustless-gateway', 1],
      ['path-unixfs-gateway', 1],
      ['path-tar-gateway', 1],
      ['path-dag-gateway', 1],
      ['path-raw-gateway', 1],
      ['path-gateway', 1],
      ['subdomain-ipfs-gateway', 1],
      ['subdomain-ipns-gateway', 1],
      ['subdomain-gateway', 1],
      ['dnslink-gateway', 1],
      ['redirects-file', 1]
    ]

    specs.forEach(([spec, maxFailingTestCount]) => {
      it(`has minimal failing tests for ${spec} spec`, async function () {
        this.timeout(5 * 60 * 1000)
        // 5 minutes per spec
        const subProcess = execa('docker', getConformanceTestArgs(spec))

        let failureCount = 0
        let successCount = 0

        await (new Promise<void>((resolve, reject) => {
          void subProcess.on('close', () => {
            resolve()
          })
        }))

        // parse the newline delimited JSON report at gwc-report.json and count the number of "PASS:" and "FAIL:" lines
        const report = await readFile(`gwc-report-${spec}.json`, 'utf8')
        const lines = report.split('\n')
        for (const line of lines) {
          if (line.includes('FAIL:')) {
            failureCount++
          } else if (line.includes('PASS:')) {
            successCount++
          }
        }

        expect(failureCount).to.be.lessThanOrEqual(maxFailingTestCount)
      })
    })
  })
})
