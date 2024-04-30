/* eslint-env mocha */
import { expect } from 'aegir/chai'
import { $ } from 'execa'
import { Agent, setGlobalDispatcher } from 'undici'

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
    // trying https://stackoverflow.com/questions/71074255/use-custom-dns-resolver-for-any-request-in-nodejs
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

  describe('gateway conformance', () => {
    const textDecoder = new TextDecoder()
    it('path-unixfs-gateway', async () => {
      // wait 30 seconds for debugging
      await new Promise((resolve) => setTimeout(resolve, 30 * 1000))
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const subProcess = $`docker run --network host -v ${process.cwd()}:/workspace -w /workspace ghcr.io/ipfs/gateway-conformance:v0.4.2 test --gateway-url=http://localhost:${process.env.PROXY_PORT!} --subdomain-url=http://localhost:${process.env.PROXY_PORT!} --verbose --json gwc-report.json --specs path-unixfs-gateway -- -timeout 30m`
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
      })

      await expect(subProcess).to.eventually.be.fulfilled()
      // expect(stdout).to.be.ok()
      // // expect(stderr).to.be.empty()
      // expect(stdout).to.contain('--- PASS: TestMetadata')
      // // expect(stderr).to.not.contain('--- FAIL:')
    })
    it('path-gateway', async () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const { stdout } = await $`docker run --network host -v ${process.cwd()}:/workspace -w /workspace ghcr.io/ipfs/gateway-conformance:v0.4.2 test --gateway-url=http://localhost:${process.env.PROXY_PORT!} --subdomain-url=http://localhost:${process.env.PROXY_PORT!} --verbose --json gwc-report.json --specs path-gateway -- -timeout 30m`
      expect(stdout).to.be.ok()
      // expect(stderr).to.be.empty()
      expect(stdout).to.contain('--- PASS: TestMetadata')
      // expect(stderr).to.not.contain('--- FAIL:')
    })

    it('subdomain-ipfs-gateway', async () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const { stdout } = await $`docker run --network host -v ${process.cwd()}:/workspace -w /workspace ghcr.io/ipfs/gateway-conformance:v0.4.2 test --gateway-url=http://localhost:${process.env.PROXY_PORT!} --subdomain-url=http://localhost:${process.env.PROXY_PORT!} --verbose --json gwc-report.json --specs subdomain-ipfs-gateway -- -timeout 30m`
      expect(stdout).to.be.ok()
      // expect(stderr).to.be.empty()
      expect(stdout).to.contain('--- PASS: TestMetadata')
      // expect(stderr).to.not.contain('--- FAIL:')
    })
  })
})
