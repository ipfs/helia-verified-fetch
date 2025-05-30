/* eslint-env mocha */
import { createVerifiedFetch } from '@helia/verified-fetch'
import { expect } from 'aegir/chai'
import { filetypemime } from 'magic-bytes.js'
import type { VerifiedFetch } from '@helia/verified-fetch'

describe('@helia/verified-fetch - unixfs directory', () => {
  let verifiedFetch: VerifiedFetch

  before(async () => {
    verifiedFetch = await createVerifiedFetch({
      gateways: ['http://127.0.0.1:8180'],
      routers: [],
      allowInsecure: true,
      allowLocal: true
    })
  })

  after(async () => {
    await verifiedFetch.stop()
  })

  describe('unixfs-dir-redirect', () => {
    [
      'https://example.com/ipfs/bafybeifq2rzpqnqrsdupncmkmhs3ckxxjhuvdcbvydkgvch3ms24k5lo7q',
      'ipfs://bafybeifq2rzpqnqrsdupncmkmhs3ckxxjhuvdcbvydkgvch3ms24k5lo7q',
      'http://example.com/ipfs/bafybeifq2rzpqnqrsdupncmkmhs3ckxxjhuvdcbvydkgvch3ms24k5lo7q'
    ].forEach((url: string) => {
      it(`request to unixfs directory with ${url} should return a 301 with a trailing slash`, async () => {
        const response = await verifiedFetch(url, {
          redirect: 'manual',
          allowLocal: true,
          allowInsecure: true
        })
        expect(response).to.be.ok()
        expect(response.status).to.equal(301)
        expect(response.headers.get('location')).to.equal(`${url}/`)
      })
    })
  })

  // This tests the content of https://explore.ipld.io/#/explore/QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm/1%20-%20Barrel%20-%20Part%201
  describe('XKCD Barrel Part 1', () => {
    it('fails to load when passed the root', async () => {
      // The spec says we should generate HTML with directory listings, but we don't do that yet, so expect a failure
      const resp = await verifiedFetch('ipfs://QmbQDovX7wRe9ek7u6QXe9zgCXkTzoUSsTFJEkrYV1HrVR', {
        allowLocal: true,
        allowInsecure: true
      })
      expect(resp).to.be.ok()
      expect(resp.status).to.equal(501) // TODO: we should do a directory listing instead
    })

    it('can return a string for deep-linked unixfs data', async () => {
      const resp = await verifiedFetch('ipfs://QmbQDovX7wRe9ek7u6QXe9zgCXkTzoUSsTFJEkrYV1HrVR/1 - Barrel - Part 1 - alt.txt', {
        allowLocal: true,
        allowInsecure: true
      })
      expect(resp).to.be.ok()
      const text = await resp.text()
      expect(text).to.equal('Don\'t we all.')
    })

    it('can return an image for deep-linked unixfs data', async () => {
      const resp = await verifiedFetch('ipfs://QmbQDovX7wRe9ek7u6QXe9zgCXkTzoUSsTFJEkrYV1HrVR/1 - Barrel - Part 1.png', {
        allowLocal: true,
        allowInsecure: true
      })
      expect(resp).to.be.ok()
      const imgData = await resp.blob()
      expect(imgData).to.be.ok()
      expect(imgData.size).to.equal(24848)
    })
  })

  describe('content type parser', () => {
    before(async () => {
      await verifiedFetch.stop()
      verifiedFetch = await createVerifiedFetch({
        gateways: ['http://127.0.0.1:8180'],
        routers: ['http://127.0.0.1:8180'],
        allowInsecure: true,
        allowLocal: true
      }, {
        contentTypeParser: (bytes) => {
          return filetypemime(bytes)?.[0]
        }
      })
    })

    it('can return an image content-type for deep-linked unixfs data', async () => {
      const resp = await verifiedFetch('ipfs://QmbQDovX7wRe9ek7u6QXe9zgCXkTzoUSsTFJEkrYV1HrVR/1 - Barrel - Part 1.png', {
        allowLocal: true,
        allowInsecure: true
      })
      // tediously this is actually a jpeg file with a .png extension
      expect(resp.headers.get('content-type')).to.equal('image/jpeg')
    })
  })

  // from https://github.com/ipfs/gateway-conformance/blob/193833b91f2e9b17daf45c84afaeeae61d9d7c7e/fixtures/trustless_gateway_car/single-layer-hamt-with-multi-block-files.car
  describe('HAMT-sharded directory', () => {
    it('loads path /ipfs/bafybeidbclfqleg2uojchspzd4bob56dqetqjsj27gy2cq3klkkgxtpn4i/685.txt', async () => {
      const resp = await verifiedFetch('ipfs://bafybeidbclfqleg2uojchspzd4bob56dqetqjsj27gy2cq3klkkgxtpn4i/685.txt', {
        allowLocal: true,
        allowInsecure: true
      })
      expect(resp).to.be.ok()
      const text = await resp.text()
      // npx kubo@0.25.0 cat '/ipfs/bafybeidbclfqleg2uojchspzd4bob56dqetqjsj27gy2cq3klkkgxtpn4i/685.txt'
      // spell-checker: disable
      expect(text).to.equal(`Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc non imperdiet nunc. Proin ac quam ut nibh eleifend aliquet. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Sed ligula dolor, imperdiet sagittis arcu et, semper tincidunt urna. Donec et tempor augue, quis sollicitudin metus. Curabitur semper ullamcorper aliquet. Mauris hendrerit sodales lectus eget fermentum. Proin sollicitudin vestibulum commodo. Vivamus nec lectus eu augue aliquet dignissim nec condimentum justo. In hac habitasse platea dictumst. Mauris vel sem neque.

Vivamus finibus, enim at lacinia semper, arcu erat gravida lacus, sit amet gravida magna orci sit amet est. Sed non leo lacus. Nullam viverra ipsum a tincidunt dapibus. Nulla pulvinar ligula sit amet ante ultrices tempus. Proin purus urna, semper sed lobortis quis, gravida vitae ipsum. Aliquam mi urna, pulvinar eu bibendum quis, convallis ac dolor. In gravida justo sed risus ullamcorper, vitae luctus massa hendrerit. Pellentesque habitant amet.`)
      // spell-checker: enable
    })
  })
})
