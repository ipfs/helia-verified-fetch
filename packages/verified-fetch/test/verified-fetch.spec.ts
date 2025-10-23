import { dagCbor } from '@helia/dag-cbor'
import { dagJson } from '@helia/dag-json'
import { json } from '@helia/json'
import { unixfs } from '@helia/unixfs'
import * as ipldDagCbor from '@ipld/dag-cbor'
import * as ipldDagJson from '@ipld/dag-json'
import { stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import last from 'it-last'
import toBuffer from 'it-to-buffer'
import { CID } from 'multiformats/cid'
import * as ipldJson from 'multiformats/codecs/json'
import * as raw from 'multiformats/codecs/raw'
import { identity } from 'multiformats/hashes/identity'
import { sha256 } from 'multiformats/hashes/sha2'
import pDefer from 'p-defer'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { dirIndexHtmlPluginFactory } from '../src/plugins/plugin-handle-dir-index-html.js'
import { VerifiedFetch } from '../src/verified-fetch.js'
import { createHelia } from './fixtures/create-offline-helia.js'
import type { Helia } from '@helia/interface'

describe('@helia/verified-fetch', () => {
  let helia: Helia

  beforeEach(async () => {
    helia = await createHelia()
  })

  afterEach(async () => {
    await stop(helia)
  })

  it('starts and stops the helia node', async () => {
    const helia = stubInterface<Helia>({
      logger: defaultLogger()
    })
    const verifiedFetch = new VerifiedFetch(helia)

    expect(helia.stop.callCount).to.equal(0)
    expect(helia.start.callCount).to.equal(0)

    await verifiedFetch.start()
    expect(helia.stop.callCount).to.equal(0)
    expect(helia.start.callCount).to.equal(1)

    await verifiedFetch.stop()
    expect(helia.stop.callCount).to.equal(1)
    expect(helia.start.callCount).to.equal(1)
  })

  describe('implicit format', () => {
    let verifiedFetch: VerifiedFetch

    beforeEach(async () => {
      verifiedFetch = new VerifiedFetch(helia)
    })

    afterEach(async () => {
      await verifiedFetch.stop()
    })

    it('should return raw data', async () => {
      const finalRootFileContent = new Uint8Array([0x01, 0x02, 0x03])
      const cid = CID.createV1(raw.code, await sha256.digest(finalRootFileContent))
      await helia.blockstore.put(cid, finalRootFileContent)

      const resp = await verifiedFetch.fetch(`ipfs://${cid}`)
      expect(resp).to.be.ok()
      expect(resp.status).to.equal(200)
      expect(resp.statusText).to.equal('OK')
      const data = await resp.arrayBuffer()
      expect(new Uint8Array(data)).to.equalBytes(finalRootFileContent)
    })

    it('should report progress during fetch', async () => {
      const finalRootFileContent = new Uint8Array([0x01, 0x02, 0x03])
      const cid = CID.createV1(raw.code, await sha256.digest(finalRootFileContent))
      await helia.blockstore.put(cid, finalRootFileContent)

      const onProgress = Sinon.spy()

      await verifiedFetch.fetch(`ipfs://${cid}`, {
        onProgress
      })

      expect(onProgress.callCount).to.equal(4)

      const onProgressEvents = onProgress.getCalls().map(call => call.args[0])
      expect(onProgressEvents[0]).to.include({ type: 'verified-fetch:request:start' }).and.to.have.property('detail').that.deep.equals({
        resource: `ipfs://${cid}`
      })
      expect(onProgressEvents[1]).to.include({ type: 'verified-fetch:request:resolve' }).and.to.have.property('detail').that.deep.equals({
        cid,
        path: ''
      })
      expect(onProgressEvents[2]).to.include({ type: 'blocks:get:blockstore:get' }).and.to.have.property('detail').that.deep.equals(cid)
      expect(onProgressEvents[3]).to.include({ type: 'verified-fetch:request:end' }).and.to.have.property('detail').that.deep.equals({
        cid,
        path: ''
      })
    })

    it('should look for index files when directory is returned', async () => {
      const finalRootFileContent = new Uint8Array([0x01, 0x02, 0x03])

      const fs = unixfs(helia)
      const res = await last(fs.addAll([{
        path: 'index.html',
        content: finalRootFileContent
      }], {
        wrapWithDirectory: true
      }))

      if (res == null) {
        throw new Error('Import failed')
      }

      const stat = await fs.stat(res.cid)
      expect(stat.type).to.equal('directory')

      const resp = await verifiedFetch.fetch(res.cid)
      expect(resp).to.be.ok()
      expect(resp.status).to.equal(200)
      expect(resp.statusText).to.equal('OK')

      const data = await resp.arrayBuffer()
      expect(new Uint8Array(data)).to.equalBytes(finalRootFileContent)
    })

    it('should return a 301 with a trailing slash when a directory is requested without a trailing slash', async () => {
      const finalRootFileContent = new Uint8Array([0x01, 0x02, 0x03])

      const fs = unixfs(helia)
      const res = await last(fs.addAll([{
        path: 'foo/index.html',
        content: finalRootFileContent
      }], {
        wrapWithDirectory: true
      }))

      if (res == null) {
        throw new Error('Import failed')
      }

      const stat = await fs.stat(res.cid)
      expect(stat.type).to.equal('directory')

      const ipfsResponse = await verifiedFetch.fetch(`ipfs://${res.cid}/foo`, {
        redirect: 'manual'
      })
      expect(ipfsResponse).to.be.ok()
      expect(ipfsResponse.status).to.equal(301)
      expect(ipfsResponse.headers.get('location')).to.equal(`ipfs://${res.cid}/foo/`)
      expect(ipfsResponse.headers.get('X-Ipfs-Path')).to.equal(`/ipfs/${res.cid}/foo`)
      expect(ipfsResponse.url).to.equal(`ipfs://${res.cid}/foo`)
    })

    it('should return a 301 with a trailing slash when a root directory is requested without a trailing slash', async () => {
      const finalRootFileContent = new Uint8Array([0x01, 0x02, 0x03])

      const fs = unixfs(helia)
      const res = await last(fs.addAll([{
        path: '/index.html',
        content: finalRootFileContent
      }], {
        wrapWithDirectory: true
      }))

      if (res == null) {
        throw new Error('Import failed')
      }

      const stat = await fs.stat(res.cid)
      expect(stat.type).to.equal('directory')

      const ipfsResponse = await verifiedFetch.fetch(`https://ipfs.local/ipfs/${res.cid}`, {
        redirect: 'manual'
      })
      expect(ipfsResponse).to.be.ok()
      expect(ipfsResponse.status).to.equal(301)
      expect(ipfsResponse.headers.get('location')).to.equal(`https://ipfs.local/ipfs/${res.cid}/`)
      expect(ipfsResponse.url).to.equal(`https://ipfs.local/ipfs/${res.cid}`)
    })

    it('should return a 301 with a trailing slash when a gateway directory is requested without a trailing slash', async () => {
      const finalRootFileContent = new Uint8Array([0x01, 0x02, 0x03])

      const fs = unixfs(helia)
      const res = await last(fs.addAll([{
        path: 'foo/index.html',
        content: finalRootFileContent
      }], {
        wrapWithDirectory: true
      }))

      if (res == null) {
        throw new Error('Import failed')
      }

      const stat = await fs.stat(res.cid)
      expect(stat.type).to.equal('directory')

      const ipfsResponse = await verifiedFetch.fetch(`https://ipfs.local/ipfs/${res.cid}/foo`, {
        redirect: 'manual'
      })
      expect(ipfsResponse).to.be.ok()
      expect(ipfsResponse.status).to.equal(301)
      expect(ipfsResponse.headers.get('location')).to.equal(`https://ipfs.local/ipfs/${res.cid}/foo/`)
      expect(ipfsResponse.url).to.equal(`https://ipfs.local/ipfs/${res.cid}/foo`)
    })

    it('should return a 301 with a trailing slash when a subdomain gateway directory is requested without a trailing slash', async () => {
      const finalRootFileContent = new Uint8Array([0x01, 0x02, 0x03])

      const fs = unixfs(helia)
      const res = await last(fs.addAll([{
        path: 'foo/index.html',
        content: finalRootFileContent
      }], {
        wrapWithDirectory: true
      }))

      if (res == null) {
        throw new Error('Import failed')
      }

      const stat = await fs.stat(res.cid)
      expect(stat.type).to.equal('directory')

      const ipfsResponse = await verifiedFetch.fetch(`https://${res.cid}.ipfs.local/foo`, {
        redirect: 'manual'
      })
      expect(ipfsResponse).to.be.ok()
      expect(ipfsResponse.status).to.equal(301)
      expect(ipfsResponse.headers.get('location')).to.equal(`https://${res.cid}.ipfs.local/foo/`)
      expect(ipfsResponse.url).to.equal(`https://${res.cid}.ipfs.local/foo`)
    })

    it('should simulate following a redirect to a path with a slash when a directory is requested without a trailing slash', async () => {
      const finalRootFileContent = new Uint8Array([0x01, 0x02, 0x03])

      const fs = unixfs(helia)
      const res = await last(fs.addAll([{
        path: 'foo/index.html',
        content: finalRootFileContent
      }], {
        wrapWithDirectory: true
      }))

      if (res == null) {
        throw new Error('Import failed')
      }

      const stat = await fs.stat(res.cid)
      expect(stat.type).to.equal('directory')

      const ipfsResponse = await verifiedFetch.fetch(`ipfs://${res.cid}/foo`)
      expect(ipfsResponse).to.be.ok()
      expect(ipfsResponse.type).to.equal('basic')
      expect(ipfsResponse.status).to.equal(200)
      expect(ipfsResponse.redirected).to.be.true()
      expect(ipfsResponse.url).to.equal(`ipfs://${res.cid}/foo/`)
    })

    it('should not redirect when a directory is requested with a trailing slash', async () => {
      const finalRootFileContent = new Uint8Array([0x01, 0x02, 0x03])

      const fs = unixfs(helia)
      const res = await last(fs.addAll([{
        path: 'foo/index.html',
        content: finalRootFileContent
      }], {
        wrapWithDirectory: true
      }))

      if (res == null) {
        throw new Error('Import failed')
      }

      const stat = await fs.stat(res.cid)
      expect(stat.type).to.equal('directory')

      const ipfsResponse = await verifiedFetch.fetch(`ipfs://${res.cid}/foo/`)
      expect(ipfsResponse).to.be.ok()
      expect(ipfsResponse.status).to.equal(200)
      expect(ipfsResponse.redirected).to.be.false()
      expect(ipfsResponse.url).to.equal(`ipfs://${res.cid}/foo/`)
    })

    it.skip('should redirect to a libp2p-key CID when a base36 CIDv1 dag-pb IPNS name is requested', async () => {
      // spell-checker: disable-next-line
      const base36str = 'k50rm9yjlt0jey4fqg6wafvqprktgbkpgkqdg27tpqje6iimzxewnhvtin9hhq'
      // const cid = CID.parse('k50rm9yjlt0jey4fqg6wafvqprktgbkpgkqdg27tpqje6iimzxewnhvtin9hhq')

      const ipfsResponse = await verifiedFetch.fetch(`https://${base36str}.ipns.local`, {
        redirect: 'manual'
      })
      expect(ipfsResponse).to.be.ok()
      expect(ipfsResponse.status).to.equal(301)
      expect(ipfsResponse.headers.get('location')).to.equal(`https://${base36str}.ipfs.local`)
      expect(ipfsResponse.url).to.equal(`https://${base36str}.ipfs.local`)
    })

    it('should allow use as a stream', async () => {
      const content = new Uint8Array([0x01, 0x02, 0x03])

      const fs = unixfs(helia)
      const cid = await fs.addBytes(content)

      const res = await verifiedFetch.fetch(cid)
      const reader = res.body?.getReader()
      const output: Uint8Array[] = []

      while (true) {
        const next = await reader?.read()

        if (next?.done === true) {
          break
        }

        if (next?.value != null) {
          output.push(next.value)
        }
      }

      expect(toBuffer(output)).to.equalBytes(content)
    })

    it('should return 501 if index file is not found', async () => {
      const finalRootFileContent = new Uint8Array([0x01, 0x02, 0x03])

      const fs = unixfs(helia)
      const res = await last(fs.addAll([{
        path: 'not_an_index.html',
        content: finalRootFileContent
      }], {
        wrapWithDirectory: true
      }))

      if (res == null) {
        throw new Error('Import failed')
      }

      const stat = await fs.stat(res.cid)
      expect(stat.type).to.equal('directory')

      const resp = await verifiedFetch.fetch(res.cid)
      expect(resp).to.be.ok()
      expect(resp.status).to.equal(501)
      expect(resp.statusText).to.equal('Not Implemented')
    })

    it('should return html directory listing if index file is not found and dir-index-html plugin is used', async () => {
      const finalRootFileContent = new Uint8Array([0x01, 0x02, 0x03])

      const verifiedFetch = new VerifiedFetch(helia, { plugins: [dirIndexHtmlPluginFactory] })

      const fs = unixfs(helia)
      const res = await last(fs.addAll([{
        path: 'not_an_index.html',
        content: finalRootFileContent
      }], {
        wrapWithDirectory: true
      }))

      if (res == null) {
        throw new Error('Import failed')
      }

      const stat = await fs.stat(res.cid)
      expect(stat.type).to.equal('directory')

      const resp = await verifiedFetch.fetch(res.cid)
      expect(resp).to.be.ok()
      expect(resp.status).to.equal(200)
      expect(resp.statusText).to.equal('OK')
      expect(resp.headers.get('content-type')).to.equal('text/html')
      expect(await resp.text()).to.include('not_an_index.html')
    })

    it('can round trip json via .json()', async () => {
      const obj = {
        hello: 'world'
      }
      const j = json(helia)
      const cid = await j.add(obj)

      const resp = await verifiedFetch.fetch(cid)
      expect(resp.headers.get('content-type')).to.equal('application/json')

      const output = await resp.json()
      await expect(j.add(output)).to.eventually.deep.equal(cid)
    })

    it('can round trip json via .arrayBuffer()', async () => {
      const obj = {
        hello: 'world'
      }
      const j = json(helia)
      const cid = await j.add(obj)

      const resp = await verifiedFetch.fetch(cid)
      expect(resp.headers.get('content-type')).to.equal('application/json')

      const output = ipldJson.decode(await resp.arrayBuffer())
      await expect(j.add(output)).to.eventually.deep.equal(cid)
    })

    it('should handle dag-json block', async () => {
      const obj = {
        hello: 'world'
      }
      const j = dagJson(helia)
      const cid = await j.add(obj)

      const resp = await verifiedFetch.fetch(cid)
      expect(resp).to.be.ok()
      expect(resp.status).to.equal(200)
      expect(resp.statusText).to.equal('OK')
      expect(resp.headers.get('content-type')).to.equal('application/vnd.ipld.dag-json')

      await expect(resp.json()).to.eventually.deep.equal(obj)
    })

    it('should return dag-json data with embedded CID', async () => {
      const obj = {
        hello: 'world',
        link: CID.parse('QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN')
      }
      const j = dagJson(helia)
      const cid = await j.add(obj)

      const resp = await verifiedFetch.fetch(cid)
      expect(resp.headers.get('content-type')).to.equal('application/vnd.ipld.dag-json')

      const data = await resp.json()
      expect(data).to.deep.equal({
        hello: 'world',
        link: {
          '/': 'QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'
        }
      })
    })

    it('should return dag-json data with embedded bytes', async () => {
      const obj = {
        hello: 'world',
        bytes: Uint8Array.from([0, 1, 2, 3, 4])
      }
      const j = dagJson(helia)
      const cid = await j.add(obj)

      const resp = await verifiedFetch.fetch(cid)
      expect(resp.headers.get('content-type')).to.equal('application/vnd.ipld.dag-json')

      const data = await resp.json()
      expect(data).to.deep.equal({
        hello: 'world',
        bytes: {
          '/': {
            bytes: 'AAECAwQ'
          }
        }
      })
    })

    it('can round trip dag-json via .json()', async () => {
      const obj = {
        hello: 'world',
        // n.b. cannot round-trip larger than Number.MAX_SAFE_INTEGER because
        // parsing DAG-JSON as using JSON.parse loses precision
        bigInt: 10n,
        link: CID.parse('QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN')
      }
      const j = dagJson(helia)
      const cid = await j.add(obj)

      const resp = await verifiedFetch.fetch(cid)
      expect(resp.headers.get('content-type')).to.equal('application/vnd.ipld.dag-json')

      const output = await resp.json()
      await expect(j.add(output)).to.eventually.deep.equal(cid)
    })

    it('can round trip dag-json via .arrayBuffer()', async () => {
      const obj = {
        hello: 'world',
        bigInt: BigInt(Number.MAX_SAFE_INTEGER) + 1n,
        link: CID.parse('QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN')
      }
      const j = dagJson(helia)
      const cid = await j.add(obj)

      const resp = await verifiedFetch.fetch(cid)
      expect(resp.headers.get('content-type')).to.equal('application/vnd.ipld.dag-json')

      const output = ipldDagJson.decode(await resp.arrayBuffer())
      await expect(j.add(output)).to.eventually.deep.equal(cid)
    })

    it('should handle JSON-compliant dag-cbor block', async () => {
      const obj = {
        hello: 'world'
      }
      const c = dagCbor(helia)
      const cid = await c.add(obj)

      const resp = await verifiedFetch.fetch(cid)
      expect(resp).to.be.ok()
      expect(resp.status).to.equal(200)
      expect(resp.statusText).to.equal('OK')
      expect(resp.headers.get('content-type')).to.equal('application/json')
      await expect(resp.json()).to.eventually.deep.equal(obj)
    })

    it('should return dag-cbor data with embedded CID', async () => {
      const obj = {
        hello: 'world',
        link: CID.parse('QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN')
      }
      const c = dagCbor(helia)
      const cid = await c.add(obj)

      const resp = await verifiedFetch.fetch(cid)
      expect(resp.headers.get('content-type')).to.equal('application/octet-stream')

      const data = await ipldDagCbor.decode(await resp.arrayBuffer())
      expect(data).to.deep.equal(obj)
    })

    it('should return dag-cbor data with embedded bytes', async () => {
      const obj = {
        hello: 'world',
        bytes: Uint8Array.from([0, 1, 2, 3, 4])
      }
      const c = dagCbor(helia)
      const cid = await c.add(obj)

      const resp = await verifiedFetch.fetch(cid)
      expect(resp.headers.get('content-type')).to.equal('application/octet-stream')

      const data = await ipldDagCbor.decode(await resp.arrayBuffer())
      expect(data).to.deep.equal(obj)
    })

    it('should allow parsing dag-cbor object array buffer as dag-json', async () => {
      const obj = {
        hello: 'world'
      }
      const c = dagCbor(helia)
      const cid = await c.add(obj)

      const resp = await verifiedFetch.fetch(cid)
      expect(resp.headers.get('content-type')).to.equal('application/json')

      const data = ipldDagJson.decode(await resp.arrayBuffer())
      expect(data).to.deep.equal(obj)
    })

    it('should return dag-cbor with a small BigInt as application/json', async () => {
      const obj = {
        hello: 'world',
        bigInt: 10n
      }
      const c = dagCbor(helia)
      const cid = await c.add(obj)

      const resp = await verifiedFetch.fetch(cid)
      expect(resp.headers.get('content-type')).to.equal('application/json')

      const data = await resp.json()
      expect(data).to.deep.equal({
        hello: 'world',
        bigInt: 10
      })
    })

    it('should return dag-cbor with a large BigInt as application/octet-stream', async () => {
      const obj = {
        hello: 'world',
        bigInt: BigInt(Number.MAX_SAFE_INTEGER) + 1n
      }
      const c = dagCbor(helia)
      const cid = await c.add(obj)

      const resp = await verifiedFetch.fetch(cid)
      expect(resp.headers.get('content-type')).to.equal('application/octet-stream')

      const data = ipldDagCbor.decode(await resp.arrayBuffer())
      expect(data).to.deep.equal(obj)
    })

    it('can round trip JSON-compliant dag-cbor via .json()', async () => {
      const obj = {
        hello: 'world'
      }
      const c = dagCbor(helia)
      const cid = await c.add(obj)

      const resp = await verifiedFetch.fetch(cid)
      expect(resp.headers.get('content-type')).to.equal('application/json')

      const output = await resp.json()
      await expect(c.add(output)).to.eventually.deep.equal(cid)
    })

    // N.b. this is not possible because the incoming block is turned into JSON
    // and returned as the response body, so `.arrayBuffer()` returns a string
    // encoded into a Uint8Array which we can't parse as CBOR
    it.skip('can round trip JSON-compliant dag-cbor via .arrayBuffer()', async () => {
      const obj = {
        hello: 'world'
      }
      const c = dagCbor(helia)
      const cid = await c.add(obj)

      const resp = await verifiedFetch.fetch(cid)
      expect(resp.headers.get('content-type')).to.equal('application/json')

      const output = ipldDagCbor.decode(await resp.arrayBuffer())
      await expect(c.add(output)).to.eventually.deep.equal(cid)
    })

    it('can round trip dag-cbor via .arrayBuffer()', async () => {
      const obj = {
        hello: 'world',
        bigInt: BigInt(Number.MAX_SAFE_INTEGER) + 1n,
        link: CID.parse('QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN')
      }
      const c = dagCbor(helia)
      const cid = await c.add(obj)

      const resp = await verifiedFetch.fetch(cid)
      expect(resp.headers.get('content-type')).to.equal('application/octet-stream')

      const output = ipldDagCbor.decode(await resp.arrayBuffer())
      await expect(c.add(output)).to.eventually.deep.equal(cid)
    })

    it('should handle json block', async () => {
      const obj = {
        hello: 'world'
      }
      const j = json(helia)
      const cid = await j.add(obj)

      const resp = await verifiedFetch.fetch(cid)
      expect(resp).to.be.ok()
      expect(resp.status).to.equal(200)
      expect(resp.statusText).to.equal('OK')
      await expect(resp.json()).to.eventually.deep.equal(obj)
    })

    it('should handle identity CID', async () => {
      const data = uint8ArrayFromString('hello world')
      const cid = CID.createV1(identity.code, identity.digest(data))

      const resp = await verifiedFetch.fetch(cid)
      expect(resp).to.be.ok()
      expect(resp.status).to.equal(200)
      expect(resp.statusText).to.equal('OK')
      await expect(resp.text()).to.eventually.equal('hello world')
    })
  })

  describe('accept', () => {
    let helia: Helia
    let verifiedFetch: VerifiedFetch
    let contentTypeParser: Sinon.SinonStub

    beforeEach(async () => {
      contentTypeParser = Sinon.stub()
      helia = await createHelia()
      verifiedFetch = new VerifiedFetch(helia, {
        contentTypeParser
      })
    })

    afterEach(async () => {
      await stop(helia, verifiedFetch)
    })

    it('should allow specifying an accept header', async () => {
      const obj = {
        hello: 'world'
      }
      const c = dagCbor(helia)
      const cid = await c.add(obj)

      const resp = await verifiedFetch.fetch(cid, {
        headers: {
          accept: 'application/octet-stream'
        }
      })
      expect(resp.headers.get('content-type')).to.equal('application/octet-stream')
      const output = ipldDagCbor.decode(new Uint8Array(await resp.arrayBuffer()))
      expect(output).to.deep.equal(obj)
    })

    it('should return a 406 if the content cannot be represented by the mime type in the accept header', async () => {
      const obj = {
        hello: 'world',
        // fails to parse as JSON
        link: CID.parse('QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN')
      }
      const c = dagCbor(helia)
      const cid = await c.add(obj)

      const resp = await verifiedFetch.fetch(cid, {
        headers: {
          accept: 'application/json'
        }
      })
      expect(resp.status).to.equal(406)
    })

    it('should return a 406 if the content type parser returns a different value to the accept header', async () => {
      contentTypeParser.returns('text/plain')

      const fs = unixfs(helia)
      const cid = await fs.addBytes(Uint8Array.from([0, 1, 2, 3, 4]))

      const resp = await verifiedFetch.fetch(cid, {
        headers: {
          accept: 'image/jpeg'
        }
      })
      expect(resp.status).to.equal(406)
    })

    it('should allow specifying an accept as raw', async () => {
      const obj = {
        hello: 'world'
      }
      const c = dagCbor(helia)
      const cid = await c.add(obj)

      const resp = await verifiedFetch.fetch(cid, {
        headers: {
          accept: 'application/vnd.ipld.raw'
        }
      })
      expect(resp.headers.get('content-type')).to.equal('application/vnd.ipld.raw')
      const output = ipldDagCbor.decode(new Uint8Array(await resp.arrayBuffer()))
      expect(output).to.deep.equal(obj)
    })
  })

  describe('encoded URI paths', () => {
    let verifiedFetch: VerifiedFetch

    beforeEach(async () => {
      verifiedFetch = new VerifiedFetch(helia)
    })

    afterEach(async () => {
      await verifiedFetch.stop()
    })

    // tests for https://github.com/ipfs-shipyard/service-worker-gateway/issues/83 issue
    it('should decode encoded URI paths', async () => {
      const finalRootFileContent = new Uint8Array([0x01, 0x02, 0x03])

      const fs = unixfs(helia)
      const res = await last(fs.addAll([{
        // spell-checker: disable-next-line
        path: "Plan_d'exécution_du_second_étage_de_l'hôtel_de_Brionne_(dessin)_De_Cotte_2503c_–_Gallica_2011_(adjusted).jpg.webp",
        content: finalRootFileContent
      }], {
        wrapWithDirectory: true
      }))

      if (res == null) {
        throw new Error('Import failed')
      }
      const { cid } = res
      const resp = await verifiedFetch.fetch(`ipfs://${cid}/${encodeURIComponent("Plan_d'exécution_du_second_étage_de_l'hôtel_de_Brionne_(dessin)_De_Cotte_2503c_–_Gallica_2011_(adjusted).jpg.webp")}`)
      expect(resp).to.be.ok()
      expect(resp.status).to.equal(200)
      expect(resp.statusText).to.equal('OK')
      const data = await resp.arrayBuffer()
      expect(new Uint8Array(data)).to.equalBytes(finalRootFileContent)
    })
  })

  describe('?format', () => {
    let helia: Helia
    let verifiedFetch: VerifiedFetch
    let contentTypeParser: Sinon.SinonStub

    beforeEach(async () => {
      contentTypeParser = Sinon.stub()
      helia = await createHelia()
      verifiedFetch = new VerifiedFetch(helia, {
        contentTypeParser
      })
    })

    afterEach(async () => {
      await stop(helia, verifiedFetch)
    })

    it('cbor?format=dag-json should be able to override curl/browser default accept header when query parameter is provided', async () => {
      const obj = {
        hello: 'world'
      }
      const c = dagCbor(helia)
      const cid = await c.add(obj)

      const resp = await verifiedFetch.fetch(`http://example.com/ipfs/${cid}?format=dag-json`, {
        headers: {
          // see https://github.com/ipfs/helia-verified-fetch/issues/35
          accept: '*/*'
        }
      })
      expect(resp.headers.get('content-type')).to.equal('application/vnd.ipld.dag-json')
      const data = ipldDagJson.decode(await resp.arrayBuffer())
      expect(data).to.deep.equal(obj)
    })

    it('raw?format=dag-json should be able to override curl/browser default accept header when query parameter is provided', async () => {
      const finalRootFileContent = uint8ArrayFromString(JSON.stringify({
        hello: 'world'
      }))
      const cid = CID.createV1(raw.code, await sha256.digest(finalRootFileContent))
      await helia.blockstore.put(cid, finalRootFileContent)

      const resp = await verifiedFetch.fetch(`http://example.com/ipfs/${cid}?format=dag-json`, {
        headers: {
          // see https://github.com/ipfs/helia-verified-fetch/issues/35
          accept: '*/*'
        }
      })
      expect(resp).to.be.ok()
      expect(resp.status).to.equal(200)
      expect(resp.statusText).to.equal('OK')
      const data = await resp.arrayBuffer()
      expect(resp.headers.get('content-type')).to.equal('application/vnd.ipld.dag-json')
      expect(new Uint8Array(data)).to.equalBytes(finalRootFileContent)
    })
  })

  describe('404 paths', () => {
    let helia: Helia
    let verifiedFetch: VerifiedFetch
    let contentTypeParser: Sinon.SinonStub

    beforeEach(async () => {
      contentTypeParser = Sinon.stub()
      helia = await createHelia()
      verifiedFetch = new VerifiedFetch(helia, {
        contentTypeParser
      })
    })

    afterEach(async () => {
      await stop(helia, verifiedFetch)
    })

    it('returns a 404 when walking dag-cbor for non-existent path', async () => {
      const obj = {
        hello: 'world'
      }
      const c = dagCbor(helia)
      const cid = await c.add(obj)

      const resp = await verifiedFetch.fetch(`http://example.com/ipfs/${cid}/foo/i-do-not-exist`)
      expect(resp.status).to.equal(404)
    })

    it('returns a 404 when walking dag-pb for non-existent path', async () => {
      const fs = unixfs(helia)

      const res = await last(fs.addAll([{
        path: 'index.html',
        content: Uint8Array.from([0x01, 0x02, 0x03])
      }], {
        wrapWithDirectory: true
      }))

      if (res == null) {
        throw new Error('Import failed')
      }

      const resp = await verifiedFetch.fetch(`ipfs://${res.cid}/does/not/exist`)
      expect(resp.status).to.equal(404)
    })

    it('returns a 404 when requesting CID path from raw CID subdomain', async () => {
      const fs = unixfs(helia)
      const cid = await fs.addBytes(Uint8Array.from([0x01, 0x02, 0x03]))

      const resp = await verifiedFetch.fetch(`https://${cid}.ipfs.localhost:3441/ipfs/${cid}`)
      expect(resp.status).to.equal(404)
    })

    it('returns a 404 when requesting CID path from dag-pb CID subdomain', async () => {
      const fs = unixfs(helia)
      const cid = await fs.addBytes(Uint8Array.from([0x01, 0x02, 0x03]), {
        rawLeaves: false
      })

      const resp = await verifiedFetch.fetch(`https://${cid}.ipfs.localhost:3441/ipfs/${cid}`)
      expect(resp.status).to.equal(404)
    })
  })

  describe('sessions', () => {
    let helia: Helia
    let verifiedFetch: VerifiedFetch

    beforeEach(async () => {
      helia = await createHelia()
      verifiedFetch = new VerifiedFetch(helia)
    })

    afterEach(async () => {
      await stop(helia, verifiedFetch)
    })

    it('should use sessions', async () => {
      const getSpy = Sinon.spy(helia.blockstore, 'get')
      const deferred = pDefer()
      const controller = new AbortController()
      const originalCreateSession = helia.blockstore.createSession.bind(helia.blockstore)

      // blockstore.createSession is called, blockstore.get is not
      helia.blockstore.createSession = Sinon.stub().callsFake((root, options) => {
        deferred.resolve()
        return originalCreateSession(root, options)
      })

      const p = verifiedFetch.fetch('http://example.com/ipfs/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJA', {
        signal: controller.signal
      })

      await deferred.promise

      expect(getSpy.called).to.be.false()

      controller.abort()
      await expect(p).to.eventually.be.rejected()
    })

    it('should not use sessions when session option is false', async () => {
      const sessionSpy = Sinon.spy(helia.blockstore, 'createSession')
      const deferred = pDefer()
      const controller = new AbortController()
      const originalGet = helia.blockstore.get.bind(helia.blockstore)

      // blockstore.get is called, blockstore.createSession is not
      helia.blockstore.get = Sinon.stub().callsFake(async (cid, options) => {
        deferred.resolve()
        return originalGet(cid, options)
      })

      const p = verifiedFetch.fetch('http://example.com/ipfs/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN/foo/i-do-not-exist', {
        signal: controller.signal,
        session: false
      })

      await deferred.promise

      expect(sessionSpy.called).to.be.false()

      controller.abort()
      await expect(p).to.eventually.be.rejected()
    })
  })
})
