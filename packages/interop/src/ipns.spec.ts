import { createVerifiedFetch } from '@helia/verified-fetch'
import { expect } from 'aegir/chai'
import type { VerifiedFetch } from '@helia/verified-fetch'

describe('@helia/verified-fetch - ipns', () => {
  let verifiedFetch: VerifiedFetch

  before(async () => {
    verifiedFetch = await createVerifiedFetch({
      gateways: ['http://127.0.0.1:8180'],
      routers: ['http://127.0.0.1:8180'],
      allowInsecure: true,
      allowLocal: true
    })
  })

  after(async () => {
    await verifiedFetch.stop()
  })

  it('should be able to load /ipns/<libp2p-key>', async () => {
    // ensure the key is being returned by the ipfs gateway itself
    const kuboResponse = await fetch('http://127.0.0.1:8180/ipns/k51qzi5uqu5dk3v4rmjber23h16xnr23bsggmqqil9z2gduiis5se8dht36dam')
    const kuboResponseBody = await kuboResponse.text()
    expect(kuboResponseBody).to.equal('hello\n')

    const res = await verifiedFetch('/ipns/k51qzi5uqu5dk3v4rmjber23h16xnr23bsggmqqil9z2gduiis5se8dht36dam')
    expect(res.status).to.equal(200)
    const body = await res.text()
    expect(body).to.equal('hello\n')
  })
})
