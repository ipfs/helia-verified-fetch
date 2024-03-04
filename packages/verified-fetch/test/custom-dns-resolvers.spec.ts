import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import { createVerifiedFetch } from '../src/index.js'
import { VerifiedFetch } from '../src/verified-fetch.js'
import { createHelia } from './fixtures/create-offline-helia.js'
import type { Helia } from '@helia/interface'

describe('custom dns-resolvers', () => {
  let helia: Helia

  beforeEach(async () => {
    helia = await createHelia()
  })

  afterEach(async () => {
    await stop(helia)
  })

  it('is used when passed to createVerifiedFetch', async () => {
    const customDnsResolver = Sinon.stub()

    customDnsResolver.returns(Promise.resolve('/ipfs/QmVP2ip92jQuMDezVSzQBWDqWFbp9nyCHNQSiciRauPLDg'))

    const fetch = await createVerifiedFetch({
      gateways: ['http://127.0.0.1:8080'],
      dnsResolvers: [customDnsResolver]
    })
    const response = await fetch('ipns://some-non-cached-domain.com')
    expect(response.status).to.equal(500)
    expect(response.statusText).to.equal('Internal Server Error')

    expect(customDnsResolver.callCount).to.equal(1)
    expect(customDnsResolver.getCall(0).args).to.deep.equal(['some-non-cached-domain.com', { onProgress: undefined }])
  })

  it('is used when passed to VerifiedFetch', async () => {
    const customDnsResolver = Sinon.stub()

    customDnsResolver.returns(Promise.resolve('/ipfs/QmVP2ip92jQuMDezVSzQBWDqWFbp9nyCHNQSiciRauPLDg'))

    const verifiedFetch = new VerifiedFetch({
      helia
    }, {
      dnsResolvers: [customDnsResolver]
    })

    const response = await verifiedFetch.fetch('ipns://some-non-cached-domain2.com')
    expect(response.status).to.equal(500)
    expect(response.statusText).to.equal('Internal Server Error')

    expect(customDnsResolver.callCount).to.equal(1)
    expect(customDnsResolver.getCall(0).args).to.deep.equal(['some-non-cached-domain2.com', { onProgress: undefined }])
  })
})
