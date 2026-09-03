import { unixfs } from '@helia/unixfs'
import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { fileTypeFromBuffer } from 'file-type'
import last from 'it-last'
import { filetypemime } from 'magic-bytes.js'
import { CID } from 'multiformats/cid'
import Sinon from 'sinon'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { createVerifiedFetch } from '../src/index.ts'
import { VerifiedFetch } from '../src/verified-fetch.ts'
import { createHelia } from './fixtures/create-offline-helia.ts'
import type { Helia } from '@helia/interface'
import type { UnixFS } from '@helia/unixfs'

describe('content-type-parser', () => {
  let helia: Helia
  let cid: CID
  let verifiedFetch: VerifiedFetch
  let fs: UnixFS

  beforeEach(async () => {
    helia = await createHelia()
    fs = unixfs(helia)
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
    verifiedFetch = new VerifiedFetch(helia, {
      contentTypeParser: () => undefined
    })
    const resp = await verifiedFetch.fetch(cid)
    expect(resp.headers.get('content-type')).to.equal('application/octet-stream')
  })

  it('sets default content type if contentTypeParser returns promise of undefined', async () => {
    verifiedFetch = new VerifiedFetch(helia, {
      contentTypeParser: async () => undefined
    })
    const resp = await verifiedFetch.fetch(cid)
    expect(resp.headers.get('content-type')).to.equal('application/octet-stream')
  })

  it('should detect js as text/javascript', async () => {
    const result = await last(fs.addAll([{
      path: '/hello.js',
      content: uint8ArrayFromString('')
    }], {
      wrapWithDirectory: true
    }))

    verifiedFetch = new VerifiedFetch(helia)
    const resp = await verifiedFetch.fetch(`ipfs://${result?.cid}/hello.js`)
    expect(resp.headers.get('content-type')).to.equal('text/javascript')
    expect(resp.headers.get('content-disposition')).to.include('filename="hello.js"')
  })

  it('should detect mjs as text/javascript', async () => {
    const result = await last(fs.addAll([{
      path: '/hello.mjs',
      content: uint8ArrayFromString('')
    }], {
      wrapWithDirectory: true
    }))

    verifiedFetch = new VerifiedFetch(helia)
    const resp = await verifiedFetch.fetch(`ipfs://${result?.cid}/hello.mjs`)
    expect(resp.headers.get('content-type')).to.equal('text/javascript')
    expect(resp.headers.get('content-disposition')).to.include('filename="hello.mjs"')
  })

  it('should detect cjs as text/javascript', async () => {
    const result = await last(fs.addAll([{
      path: '/hello.cjs',
      content: uint8ArrayFromString('')
    }], {
      wrapWithDirectory: true
    }))

    verifiedFetch = new VerifiedFetch(helia)
    const resp = await verifiedFetch.fetch(`ipfs://${result?.cid}/hello.cjs`)
    expect(resp.headers.get('content-type')).to.equal('text/javascript')
    expect(resp.headers.get('content-disposition')).to.include('filename="hello.cjs"')
  })

  it('should detect empty file as text/plain; charset=utf-8', async () => {
    const cid = await fs.addBytes(new Uint8Array(0))

    verifiedFetch = new VerifiedFetch(helia)
    const resp = await verifiedFetch.fetch(`ipfs://${cid}`)
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('content-length')).to.equal('0')
    expect(resp.headers.get('content-type')).to.equal('text/plain; charset=utf-8')
    expect(resp.headers.get('content-disposition')).to.include(`filename="${cid}"`)
  })

  it('is passed a filename if it is available', async () => {
    const dir = await fs.addDirectory()
    const index = await fs.addBytes(uint8ArrayFromString('<html><body>Hello world</body></html>'))
    const dirCid = await fs.cp(index, dir, 'index.html')

    verifiedFetch = new VerifiedFetch(helia, {
      contentTypeParser: async (data, fileName) => fileName
    })
    const resp = await verifiedFetch.fetch(`ipfs://${dirCid}/index.html`)
    expect(resp.headers.get('content-type')).to.equal('index.html')
    expect(resp.headers.get('content-disposition')).to.include('filename="index.html"')
  })

  it('is passed a filename from a deep traversal if it is available', async () => {
    let barDir = await fs.addDirectory({ path: './bar' })
    const aFileHtml = await fs.addBytes(uint8ArrayFromString('<html><body>Hello world</body></html>'))
    barDir = await fs.cp(aFileHtml, barDir, 'a-file.html')
    let fooDir = await fs.addDirectory({ path: './foo' })
    fooDir = await fs.cp(barDir, fooDir, 'bar')
    let deepDirCid = await fs.addDirectory()
    deepDirCid = await fs.cp(fooDir, deepDirCid, 'foo')

    verifiedFetch = new VerifiedFetch(helia, {
      contentTypeParser: async (data, fileName) => fileName
    })
    const resp = await verifiedFetch.fetch(`ipfs://${deepDirCid}/foo/bar/a-file.html`)
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('content-type')).to.equal('a-file.html')
    expect(resp.headers.get('content-disposition')).to.include('filename="a-file.html"')
  })

  it('sets content type if contentTypeParser is passed', async () => {
    verifiedFetch = new VerifiedFetch(helia, {
      contentTypeParser: () => 'text/plain'
    })
    const resp = await verifiedFetch.fetch(cid)
    expect(resp.headers.get('content-type')).to.equal('text/plain')
  })

  it('supports file-type as a contentTypeParser', async () => {
    verifiedFetch = new VerifiedFetch(helia, {
      contentTypeParser: async (bytes) => {
        const type = await fileTypeFromBuffer(bytes)
        return type?.mime
      }
    })
    const resp = await verifiedFetch.fetch(cid)
    expect(resp.headers.get('content-type')).to.equal('application/gzip')
  })

  it('supports magic-bytes.js as a contentTypeParser', async () => {
    verifiedFetch = new VerifiedFetch(helia, {
      contentTypeParser: (bytes) => {
        return filetypemime(bytes)?.[0]
      }
    })
    const resp = await verifiedFetch.fetch(cid)
    expect(resp.headers.get('content-type')).to.equal('application/gzip')
  })

  it('can properly set content type for identity CIDs', async () => {
    verifiedFetch = new VerifiedFetch(helia, {
      contentTypeParser: async (data) => {
        return 'text/plain'
      }
    })
    const resp = await verifiedFetch.fetch(CID.parse('bafkqablimvwgy3y'))
    expect(resp.headers.get('content-type')).to.equal('text/plain')
  })

  /**
   * A single silent MPEG-1 Layer III frame - the `FF FB 90 00` sync word plus
   * a zero-filled body, 417 bytes in total (the frame size for 128kbps @
   * 44.1kHz).
   */
  function mp3Frame (): Uint8Array {
    const frame = new Uint8Array(417)
    frame.set([0xFF, 0xFB, 0x90, 0x00])

    return frame
  }

  it('should detect mp3 as audio/mpeg when the frame sync is behind padding', async () => {
    // file-type only recognises an MPEG frame sync at offset 0, so a file that
    // opens with silence falls through to the filename extension
    // @see https://github.com/ipfs/service-worker-gateway/issues/1197
    const frame = mp3Frame()
    const padded = new Uint8Array(frame.length * 2)
    padded.set(frame, frame.length)

    expect(await fileTypeFromBuffer(padded)).to.equal(undefined)

    const result = await last(fs.addAll([{
      path: '/audio.mp3',
      content: padded
    }], {
      wrapWithDirectory: true
    }))

    verifiedFetch = new VerifiedFetch(helia)
    const resp = await verifiedFetch.fetch(`ipfs://${result?.cid}/audio.mp3`)
    expect(resp.headers.get('content-type')).to.equal('audio/mpeg')
    expect(resp.headers.get('content-disposition')).to.include('filename="audio.mp3"')
  })

  it('should match the extension case-insensitively', async () => {
    const frame = mp3Frame()
    const padded = new Uint8Array(frame.length * 2)
    padded.set(frame, frame.length)

    const result = await last(fs.addAll([{
      path: '/AUDIO.MP3',
      content: padded
    }], {
      wrapWithDirectory: true
    }))

    verifiedFetch = new VerifiedFetch(helia)
    const resp = await verifiedFetch.fetch(`ipfs://${result?.cid}/AUDIO.MP3`)
    expect(resp.headers.get('content-type')).to.equal('audio/mpeg')
  })

  it('should prefer sniffed bytes over the filename extension', async () => {
    // a PNG that happens to be named .mp3 is still a PNG
    const png = new Uint8Array([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
      0x0D, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x62, 0x60, 0x01, 0x00, 0x00,
      0x00, 0x05, 0x00, 0x01, 0xAA, 0xEE, 0xC4, 0x22, 0x00, 0x00, 0x00, 0x00,
      0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ])

    const result = await last(fs.addAll([{
      path: '/not-audio.mp3',
      content: png
    }], {
      wrapWithDirectory: true
    }))

    verifiedFetch = new VerifiedFetch(helia)
    const resp = await verifiedFetch.fetch(`ipfs://${result?.cid}/not-audio.mp3`)
    expect(resp.headers.get('content-type')).to.equal('image/png')
  })

  it('should detect md as text/markdown', async () => {
    const result = await last(fs.addAll([{
      path: '/readme.md',
      content: uint8ArrayFromString('# hello\n')
    }], {
      wrapWithDirectory: true
    }))

    verifiedFetch = new VerifiedFetch(helia)
    const resp = await verifiedFetch.fetch(`ipfs://${result?.cid}/readme.md`)
    expect(resp.headers.get('content-type')).to.equal('text/markdown')
  })
})
