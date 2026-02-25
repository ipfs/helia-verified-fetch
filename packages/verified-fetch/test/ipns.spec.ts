import { dagCbor } from '@helia/dag-cbor'
import { unixfs } from '@helia/unixfs'
import { generateKeyPair } from '@libp2p/crypto/keys'
import { stop } from '@libp2p/interface'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { createHelia } from 'helia'
import { createIPNSRecord } from 'ipns'
import { stubInterface } from 'sinon-ts'
import { createVerifiedFetch } from '../src/index.ts'
import type { VerifiedFetch } from '../src/index.ts'
import type { IPNSResolver } from '@helia/ipns'
import type { Helia } from 'helia'
import type { StubbedInstance } from 'sinon-ts'

describe('IPNS', () => {
  let helia: Helia
  let fetch: VerifiedFetch
  let ipnsResolver: StubbedInstance<IPNSResolver>

  beforeEach(async () => {
    helia = await createHelia()
    ipnsResolver = stubInterface()
    fetch = await createVerifiedFetch(helia, {
      ipnsResolver
    })
  })

  afterEach(async () => {
    await stop(helia)
  })

  it('should resolve an IPNS name', async () => {
    const obj = {
      hello: 'world'
    }
    const c = dagCbor(helia)
    const cid = await c.add(obj)

    const privateKey = await generateKeyPair('Ed25519')
    const record = await createIPNSRecord(privateKey, cid, 1, 10_000)
    const peerId = peerIdFromPrivateKey(privateKey)

    ipnsResolver.resolve.withArgs(peerId).resolves({
      cid,
      record
    })

    const resp = await fetch(`ipns://${peerId}`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal(`ipns://${peerId}`)
    expect(resp.headers.get('X-Ipfs-Path')).to.equal(`/ipns/${peerId}`)
    expect(resp.headers.get('X-Ipfs-Roots')).to.equal(`${cid}`)
  })

  it('should resolve an IPNS name with a path', async () => {
    const path = 'foo.bin'
    const fs = unixfs(helia)
    const fileCid = await fs.addBytes(Uint8Array.from([0, 1, 2, 3]))
    const dirCid = await fs.addDirectory()
    const cid = await fs.cp(fileCid, dirCid, path)

    const privateKey = await generateKeyPair('Ed25519')
    const record = await createIPNSRecord(privateKey, `/ipfs/${cid}/${path}`, 1, 10_000)
    const peerId = peerIdFromPrivateKey(privateKey)

    ipnsResolver.resolve.withArgs(peerId).resolves({
      cid,
      path,
      record
    })

    const resp = await fetch(`ipns://${peerId}/`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal(`ipns://${peerId}/`)
    expect(resp.headers.get('X-Ipfs-Path')).to.equal(`/ipns/${peerId}`)
    expect(resp.headers.get('X-Ipfs-Roots')).to.equal(`${cid},${fileCid}`)
  })

  it('should resolve a Libp2p PeerId encoded as a CID', async () => {
    const fs = unixfs(helia)
    const cid = await fs.addDirectory()

    const privateKey = await generateKeyPair('Ed25519')
    const record = await createIPNSRecord(privateKey, `/ipfs/${cid}`, 1, 10_000)
    const peerId = peerIdFromPrivateKey(privateKey)

    ipnsResolver.resolve.withArgs(peerId).resolves({
      cid,
      record
    })

    const resp = await fetch(`ipfs://${peerId.toCID()}/`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal(`ipfs://${peerId.toCID()}/`)
    expect(resp.headers.get('X-Ipfs-Path')).to.equal(`/ipfs/${peerId.toCID()}`)
    expect(resp.headers.get('X-Ipfs-Roots')).to.equal(`${cid}`)
  })

  it('should resolve a Libp2p PeerId encoded as a CID that includes a path', async () => {
    const path = 'foo.bin'
    const fs = unixfs(helia)
    const fileCid = await fs.addBytes(Uint8Array.from([0, 1, 2, 3]))
    const dirCid = await fs.addDirectory()
    const cid = await fs.cp(fileCid, dirCid, path)

    const privateKey = await generateKeyPair('Ed25519')
    const record = await createIPNSRecord(privateKey, `/ipfs/${cid}/${path}`, 1, 10_000)
    const peerId = peerIdFromPrivateKey(privateKey)

    ipnsResolver.resolve.withArgs(peerId).resolves({
      cid,
      path,
      record
    })

    const resp = await fetch(`ipfs://${peerId.toCID()}/`)
    expect(resp).to.be.ok()
    expect(resp.status).to.equal(200)
    expect(resp.redirected).to.be.false()
    expect(resp.url).to.equal(`ipfs://${peerId.toCID()}/`)
    expect(resp.headers.get('X-Ipfs-Path')).to.equal(`/ipfs/${peerId.toCID()}`)
    expect(resp.headers.get('X-Ipfs-Roots')).to.equal(`${cid},${fileCid}`)
  })
})
