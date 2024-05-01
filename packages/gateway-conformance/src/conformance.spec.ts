/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-env mocha */
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
  this.timeout(60 * 1000)

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

  it('gateway conformance', async () => {
    const textDecoder = new TextDecoder()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const subProcess = execa('docker', [
      'run',
      '--network',
      'host',
      '-v',
      `${process.cwd()}:/workspace`,
      '-w',
      '/workspace',
      'ghcr.io/ipfs/gateway-conformance:v0.5.1',
      'test',
      `--gateway-url=http://${process.env.CONFORMANCE_HOST!}:${process.env.PROXY_PORT!}`,
      `--subdomain-url=http://${process.env.CONFORMANCE_HOST!}:${process.env.PROXY_PORT!}`,
      '--verbose',
      '--json', 'gwc-report.json',
      '--',
      '-timeout', '30m',
      // `-run=(${testsToRun.join('|')})`,
      '-skip', `"(${testsToSkip.join('|')})"`
    ])

    subProcess.stderr?.on('data', (data) => {
      // convert Uint8Array to string
      const text = textDecoder.decode(data)
      // eslint-disable-next-line no-console
      console.log('stderr text', text)
      expect(text).not.to.contain('--- FAIL:')
    })
    subProcess.stdout?.on('data', (data) => {
      const text = textDecoder.decode(data)
      // eslint-disable-next-line no-console
      console.log('stdout text', text)
      expect(text).not.to.contain('--- FAIL:')
      // expect(test).not.to.contain('no tests to run')
    })

    await expect(subProcess).to.eventually.be.fulfilled()
  })
})
