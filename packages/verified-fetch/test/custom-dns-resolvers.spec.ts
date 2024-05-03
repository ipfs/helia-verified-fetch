import { stop } from '@libp2p/interface'
import { dns, RecordType } from '@multiformats/dns'
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
    const customDnsResolver = Sinon.stub().withArgs('_dnslink.some-non-cached-domain.com').resolves({
      Answer: [{
        data: 'dnslink=/ipfs/bafkqabtimvwgy3yk'
      }]
    })

    const fetch = await createVerifiedFetch({
      gateways: ['http://127.0.0.1:8080'],
      dnsResolvers: [customDnsResolver]
    })
    await fetch('ipns://some-non-cached-domain.com')

    expect(customDnsResolver.callCount).to.equal(1)
    expect(customDnsResolver.getCall(0).args).to.deep.equal(['_dnslink.some-non-cached-domain.com', {
      types: [
        RecordType.TXT
      ]
    }])
  })

  it('is used when passed to VerifiedFetch', async () => {
    const customDnsResolver = Sinon.stub().withArgs('_dnslink.some-non-cached-domain2.com').resolves({
      Answer: [{
        data: 'dnslink=/ipfs/bafkqabtimvwgy3yk'
      }]
    })

    await stop(helia)
    helia = await createHelia({
      dns: dns({
        resolvers: {
          '.': customDnsResolver
        }
      })
    })

    const verifiedFetch = new VerifiedFetch({
      helia
    })

    await verifiedFetch.fetch('ipns://some-non-cached-domain2.com')

    expect(customDnsResolver.callCount).to.equal(1)
    expect(customDnsResolver.getCall(0).args).to.deep.equal(['_dnslink.some-non-cached-domain2.com', {
      types: [
        RecordType.TXT
      ]
    }])
  })
})
