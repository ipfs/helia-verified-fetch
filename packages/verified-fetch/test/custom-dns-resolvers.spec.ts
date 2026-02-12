import { stop } from '@libp2p/interface'
import { dns, RecordType } from '@multiformats/dns'
import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import { createVerifiedFetch } from '../src/index.js'
import { createHelia } from './fixtures/create-offline-helia.js'
import type { VerifiedFetch } from '../src/index.js'
import type { Helia } from 'helia'

describe('custom dns-resolvers', () => {
  let helia: Helia
  let fetch: VerifiedFetch

  afterEach(async () => {
    await stop(helia, fetch)
  })

  it('is used when passed to createVerifiedFetch', async () => {
    const customDnsResolver = Sinon.stub().withArgs('_dnslink.some-non-cached-domain.com').resolves({
      Answer: [{
        data: 'dnslink=/ipfs/bafkqac3imvwgy3zao5xxe3de'
      }]
    })

    fetch = await createVerifiedFetch({
      gateways: ['http://127.0.0.1:8080'],
      dnsResolvers: [customDnsResolver]
    })
    const response = await fetch('ipns://some-non-cached-domain.com')
    expect(response.status).to.equal(200)
    expect(response.statusText).to.equal('OK')
    await expect(response.text()).to.eventually.equal('hello world')

    expect(customDnsResolver.calledWith('_dnslink.some-non-cached-domain.com', {
      types: [
        RecordType.TXT
      ],
      logger: undefined
    })).to.be.true()
  })

  it('is used when passed to VerifiedFetch', async () => {
    const customDnsResolver = Sinon.stub().withArgs('_dnslink.some-non-cached-domain2.com').resolves({
      Answer: [{
        data: 'dnslink=/ipfs/bafkqac3imvwgy3zao5xxe3de'
      }]
    })

    helia = await createHelia({
      dns: dns({
        resolvers: {
          '.': customDnsResolver
        }
      })
    })

    fetch = await createVerifiedFetch(helia)

    const response = await fetch('ipns://some-non-cached-domain2.com')
    expect(response.status).to.equal(200)
    expect(response.statusText).to.equal('OK')
    await expect(response.text()).to.eventually.equal('hello world')

    expect(customDnsResolver.callCount).to.equal(1)
    expect(customDnsResolver.getCall(0).args).to.deep.equal(['_dnslink.some-non-cached-domain2.com', {
      types: [
        RecordType.TXT
      ],
      logger: undefined
    }])
  })
})
