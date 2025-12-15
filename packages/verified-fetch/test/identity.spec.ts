import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { CID } from 'multiformats/cid'
import { stubInterface } from 'sinon-ts'
import { VerifiedFetch } from '../src/verified-fetch.js'
import { createHelia } from './fixtures/create-offline-helia.js'
import type { Helia } from '@helia/interface'
import type { IPNSResolver } from '@helia/ipns'
import type { StubbedInstance } from 'sinon-ts'

describe('identity blocks', () => {
  let helia: Helia
  let ipnsResolver: StubbedInstance<IPNSResolver>
  let verifiedFetch: VerifiedFetch

  beforeEach(async () => {
    helia = await createHelia()
    ipnsResolver = stubInterface()
    verifiedFetch = new VerifiedFetch(helia, {
      ipnsResolver
    })
  })

  afterEach(async () => {
    await stop(helia, verifiedFetch)
  })

  it('should support fetching an identity block', async () => {
    const cid = CID.parse('bafkqabtimvwgy3yk')

    const resp = await verifiedFetch.fetch(`ipfs://${cid}`)

    expect(resp.status).to.equal(200)
    expect(resp.headers.get('content-type')).to.equal('text/plain; charset=utf-8')
    expect(resp.headers.get('content-length')).to.equal('6')
    expect(resp.headers.get('x-ipfs-roots')).to.equal(cid.toV1().toString())

    expect(await resp.text()).to.equal('hello\n')
  })
})
