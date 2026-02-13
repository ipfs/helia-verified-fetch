import { unixfs } from '@helia/unixfs'
import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { createHelia } from 'helia'
import last from 'it-last'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { VerifiedFetch } from '../src/verified-fetch.ts'
import type { UnixFS } from '@helia/unixfs'
import type { Helia } from 'helia'

describe('_redirects', () => {
  let helia: Helia
  let verifiedFetch: VerifiedFetch
  let fs: UnixFS

  beforeEach(async () => {
    helia = await createHelia()
    fs = unixfs(helia)
    verifiedFetch = new VerifiedFetch(helia)
  })

  afterEach(async () => {
    await stop(helia, verifiedFetch)
  })

  it('should follow redirects in a _redirects file', async () => {
    const redirects = '/foo.html /bar.html 200'
    const bar = 'bar.html'

    const result = await last(fs.addAll([{
      path: './_redirects',
      content: uint8ArrayFromString(redirects)
    }, {
      path: './bar.html',
      content: uint8ArrayFromString(bar)
    }]))

    if (result == null) {
      throw new Error('Import failed')
    }

    const response = await verifiedFetch.fetch(`ipfs://${result.cid}/foo.html`)
    expect(response).to.have.property('status', 200)
    expect(response).to.have.property('redirected', true)

    await expect(response.text()).to.eventually.equal(bar)
  })

  it('should manually follow redirects in a _redirects file', async () => {
    const redirects = '/foo.html /bar.html 302'
    const bar = 'bar.html'

    const result = await last(fs.addAll([{
      path: './_redirects',
      content: uint8ArrayFromString(redirects)
    }, {
      path: './bar.html',
      content: uint8ArrayFromString(bar)
    }]))

    if (result == null) {
      throw new Error('Import failed')
    }

    const response = await verifiedFetch.fetch(`ipfs://${result.cid}/foo.html`, {
      redirect: 'manual'
    })
    expect(response).to.have.property('status', 302)
    expect(response.headers.get('location')).to.equal(`ipfs://${result.cid}/bar.html`)
  })

  it('should support wildcards in a _redirects file', async () => {
    const redirects = '/* /bar.html'
    const bar = 'bar.html'

    const result = await last(fs.addAll([{
      path: './_redirects',
      content: uint8ArrayFromString(redirects)
    }, {
      path: './bar.html',
      content: uint8ArrayFromString(bar)
    }]))

    if (result == null) {
      throw new Error('Import failed')
    }

    const response = await verifiedFetch.fetch(`ipfs://${result.cid}/foo.html`)
    expect(response).to.have.property('status', 200)
    expect(response).to.have.property('redirected', true)

    await expect(response.text()).to.eventually.equal(bar)
  })

  it('should only follow redirects when the requested path does not exist', async () => {
    const redirects = '/foo.html /bar.html 302'
    const contents = 'foo.html'

    const result = await last(fs.addAll([{
      path: './_redirects',
      content: uint8ArrayFromString(redirects)
    }, {
      path: './foo.html',
      content: uint8ArrayFromString(contents)
    }]))

    if (result == null) {
      throw new Error('Import failed')
    }

    const response = await verifiedFetch.fetch(`ipfs://${result.cid}/foo.html`, {
      redirect: 'manual'
    })
    expect(response).to.have.property('status', 200)
    expect(response).to.have.property('redirected', false)
    await expect(response.text()).to.eventually.equal(contents)
  })
})
