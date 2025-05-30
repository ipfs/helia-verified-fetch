import { unixfs } from '@helia/unixfs'
import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { fileTypeFromBuffer } from 'file-type'
import { filetypemime } from 'magic-bytes.js'
import { CID } from 'multiformats/cid'
import Sinon from 'sinon'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { createVerifiedFetch } from '../src/index.js'
import { VerifiedFetch } from '../src/verified-fetch.js'
import { createHelia } from './fixtures/create-offline-helia.js'
import type { Helia } from '@helia/interface'

describe('content-type-parser', () => {
  let helia: Helia
  let cid: CID
  let verifiedFetch: VerifiedFetch

  beforeEach(async () => {
    helia = await createHelia()
    const fs = unixfs(helia)
    cid = await fs.addByteStream((async function * () {
      yield uint8ArrayFromString('H4sICIlTHVIACw', 'base64')
    })())
  })

  afterEach(async () => {
    await stop(verifiedFetch)
  })

  it('can be overridden by passing a custom contentTypeParser', async () => {
    let called = false
    const contentTypeParser = Sinon.stub().callsFake(() => {
      called = true
      return 'text/plain'
    })
    const fetch = await createVerifiedFetch(helia, {
      contentTypeParser
    })
    expect(fetch).to.be.ok()
    const resp = await fetch(cid)
    expect(resp.headers.get('content-type')).to.equal('text/plain')
    expect(called).to.equal(true)
    await fetch.stop()
  })

  it('sets default content type if contentTypeParser returns undefined', async () => {
    verifiedFetch = new VerifiedFetch({
      helia
    }, {
      contentTypeParser: () => undefined
    })
    const resp = await verifiedFetch.fetch(cid)
    expect(resp.headers.get('content-type')).to.equal('application/octet-stream')
  })

  it('sets default content type if contentTypeParser returns promise of undefined', async () => {
    verifiedFetch = new VerifiedFetch({
      helia
    }, {
      contentTypeParser: async () => undefined
    })
    const resp = await verifiedFetch.fetch(cid)
    expect(resp.headers.get('content-type')).to.equal('application/octet-stream')
  })

  it('is passed a filename if it is available', async () => {
    const fs = unixfs(helia)
    const dir = await fs.addDirectory()
    const index = await fs.addBytes(uint8ArrayFromString('<html><body>Hello world</body></html>'))
    const dirCid = await fs.cp(index, dir, 'index.html')

    verifiedFetch = new VerifiedFetch({
      helia
    }, {
      contentTypeParser: async (data, fileName) => fileName
    })
    const resp = await verifiedFetch.fetch(`ipfs://${dirCid}/index.html`)
    expect(resp.headers.get('content-type')).to.equal('index.html')
  })

  it('is passed a filename from a deep traversal if it is available', async () => {
    const fs = unixfs(helia)

    let barDir = await fs.addDirectory({ path: './bar' })
    const aFileHtml = await fs.addBytes(uint8ArrayFromString('<html><body>Hello world</body></html>'))
    barDir = await fs.cp(aFileHtml, barDir, 'a-file.html')
    let fooDir = await fs.addDirectory({ path: './foo' })
    fooDir = await fs.cp(barDir, fooDir, 'bar')
    let deepDirCid = await fs.addDirectory()
    deepDirCid = await fs.cp(fooDir, deepDirCid, 'foo')

    verifiedFetch = new VerifiedFetch({
      helia
    }, {
      contentTypeParser: async (data, fileName) => fileName
    })
    const resp = await verifiedFetch.fetch(`ipfs://${deepDirCid}/foo/bar/a-file.html`)
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('content-type')).to.equal('a-file.html')
  })

  it('sets content type if contentTypeParser is passed', async () => {
    verifiedFetch = new VerifiedFetch({
      helia
    }, {
      contentTypeParser: () => 'text/plain'
    })
    const resp = await verifiedFetch.fetch(cid)
    expect(resp.headers.get('content-type')).to.equal('text/plain')
  })

  it('supports file-type as a contentTypeParser', async () => {
    verifiedFetch = new VerifiedFetch({
      helia
    }, {
      contentTypeParser: async (bytes) => {
        const type = await fileTypeFromBuffer(bytes)
        return type?.mime
      }
    })
    const resp = await verifiedFetch.fetch(cid)
    expect(resp.headers.get('content-type')).to.equal('application/gzip')
  })

  it('supports magic-bytes.js as a contentTypeParser', async () => {
    verifiedFetch = new VerifiedFetch({
      helia
    }, {
      contentTypeParser: (bytes) => {
        return filetypemime(bytes)?.[0]
      }
    })
    const resp = await verifiedFetch.fetch(cid)
    expect(resp.headers.get('content-type')).to.equal('application/gzip')
  })

  it('can properly set content type for identity CIDs', async () => {
    verifiedFetch = new VerifiedFetch({
      helia
    }, {
      contentTypeParser: async (data) => {
        return 'text/plain'
      }
    })
    const resp = await verifiedFetch.fetch(CID.parse('bafkqablimvwgy3y'))
    expect(resp.headers.get('content-type')).to.equal('text/plain')
  })
})
