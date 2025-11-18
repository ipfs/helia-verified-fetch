import { dagCbor } from '@helia/dag-cbor'
import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { createVerifiedFetch } from '../src/index.js'
import { createHelia } from './fixtures/create-offline-helia.js'
import type { VerifiedFetch } from '../src/index.js'
import type { DNSLink } from '@helia/dnslink'
import type { Helia } from '@helia/interface'
import type { IPNSResolver } from '@helia/ipns'
import type { StubbedInstance } from 'sinon-ts'

describe('content-disposition', () => {
  let helia: Helia
  let fetch: VerifiedFetch
  let dnsLink: StubbedInstance<DNSLink>
  let ipnsResolver: StubbedInstance<IPNSResolver>

  beforeEach(async () => {
    helia = await createHelia()
    dnsLink = stubInterface()
    ipnsResolver = stubInterface()
    fetch = await createVerifiedFetch(helia, {
      dnsLink,
      ipnsResolver
    })
  })

  afterEach(async () => {
    await stop(helia)
  })

  it('should inline by default', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const resp = await fetch(`ipfs://${cid}?filename=foo.txt`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('Content-Disposition')).to.include('inline')
    expect(resp.headers.get('Content-Disposition')).to.include('filename="foo.txt"')
  })

  it('should attach when download is true', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const resp = await fetch(`ipfs://${cid}?download=true`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('Content-Disposition')).to.include('attachment')
  })

  it('should default to the CID for the car file name', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const resp = await fetch(`ipfs://${cid}/?format=car`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('Content-Disposition')).to.include('attachment')
    expect(resp.headers.get('Content-Disposition')).to.include(`filename="${cid}.car"`)
  })

  it('should respect a filename for the car file name', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const resp = await fetch(`ipfs://${cid}/?filename=my-car.car&format=car`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('Content-Disposition')).to.include('attachment')
    expect(resp.headers.get('Content-Disposition')).to.include(`filename="my-car.car"`)
  })

  it('should respect a filename for the car file name with many trailing slashes', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const resp = await fetch(`ipfs://${cid}///////?filename=my-car.car&format=car`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.headers.get('Content-Disposition')).to.include('attachment')
    expect(resp.headers.get('Content-Disposition')).to.include(`filename="my-car.car"`)
  })
})
