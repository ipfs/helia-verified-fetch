/* eslint-env mocha */
import { expect } from 'aegir/chai'
import { $ } from 'execa'
// import { CID } from 'multiformats/cid'
// import { createKuboNode } from './fixtures/create-kubo.js'
import { createVerifiedFetch } from './fixtures/create-verified-fetch.js'
// import { loadFixtureDataCar } from './fixtures/load-fixture-data.js'
// import type { Controller } from 'ipfsd-ctl'

describe('@helia/verified-fetch - json', () => {
  describe('unixfs - multiblock', () => {
    // let controller: Controller<'go'>
    let verifiedFetch: Awaited<ReturnType<typeof createVerifiedFetch>>

    before(async () => {
      if (process.env.KUBO_GATEWAY == null) {
        throw new Error('KUBO_GATEWAY env var is required')
      }
      if (process.env.PROXY_PORT == null) {
        throw new Error('PROXY_PORT env var is required')
      }
      // controller = await createKuboNode()
      // await controller.start()
      // As of 2024-01-18, https://cloudflare-ipfs.com/ipns/tokens.uniswap.org resolves to:
      // root: QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr
      // child1: QmNik5N4ryNwzzXYq5hCYKGcRjAf9QtigxtiJh9o8aXXbG // partial JSON
      // child2: QmWNBJX6fZyNTLWNYBHxAHpBctCP43R2zeqV2G8uavqFZn // partial JSON
      // await loadFixtureDataCar(controller, 'QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr-tokens.uniswap.org-2024-01-18.car')
      verifiedFetch = await createVerifiedFetch({
        gateways: [process.env.KUBO_GATEWAY],
        routers: [process.env.KUBO_GATEWAY]
      })
    })

    after(async () => {
      // await controller.stop()
      await verifiedFetch.stop()
    })

    it('reverse proxy is running', async () => {
      // check for identity CID at proxy endpoint to ensure it's working
      // echo "hello" | npx kubo add --cid-version 1 --inline === bafkqabtimvwgy3yk
      const resp = await verifiedFetch('ipfs://bafkqabtimvwgy3yk')
      expect(resp).to.be.ok()
      expect(resp.status).to.equal(200)
      const text = await resp.text()
      expect(text.trim()).to.equal('hello')
    })

    it('handles UnixFS-chunked JSON file', async () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const { stdout, stderr } = await $({ env: { PWD: process.cwd() } })`docker run --network host -v ${process.cwd()}:/workspace -w /workspace ghcr.io/ipfs/gateway-conformance:v0.4.2 test --gateway-url=http://localhost:${process.env.PROXY_PORT!} --subdomain-url=http://localhost:${process.env.PROXY_PORT!} --verbose --json gwc-report.json --specs subdomain-ipns-gateway,subdomain-ipfs-gateway -- -timeout 30m`
      expect(stdout).to.be.ok()
      expect(stderr).to.be.empty()
      // const resp = await verifiedFetch(CID.parse('QmQJ8fxavY54CUsxMSx9aE9Rdcmvhx8awJK2jzJp4iAqCr'))
      // expect(resp).to.be.ok()
      // const jsonObj = await resp.json()
      // expect(jsonObj).to.be.ok()
      // expect(jsonObj).to.have.property('name').equal('Uniswap Labs Default')
      // expect(jsonObj).to.have.property('timestamp').equal('2023-12-13T18:25:25.830Z')
      // expect(jsonObj).to.have.property('version').to.deep.equal({ major: 11, minor: 11, patch: 0 })
      // expect(jsonObj).to.have.property('tags')
      // expect(jsonObj).to.have.property('logoURI').equal('ipfs://QmNa8mQkrNKp1WEEeGjFezDmDeodkWRevGFN8JCV7b4Xir')
      // expect(jsonObj).to.have.property('keywords').to.deep.equal(['uniswap', 'default'])
      // expect(jsonObj.tokens).to.be.an('array').of.length(767)
    })
  })
})
