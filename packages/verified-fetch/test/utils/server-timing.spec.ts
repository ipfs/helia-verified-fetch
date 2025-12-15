import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import { identity } from 'multiformats/hashes/identity'
import { createVerifiedFetch } from '../../src/index.js'
import { ServerTiming } from '../../src/utils/server-timing.js'
import { createHelia } from '../fixtures/create-offline-helia.js'
import type { VerifiedFetch } from '../../src/index.js'
import type { Helia } from 'helia'

describe('serverTiming', () => {
  let serverTiming: ServerTiming

  beforeEach(() => {
    serverTiming = new ServerTiming()
  })

  it('should return a success object with the correct header and no error', async () => {
    const name = 'testSuccess'
    const description = 'Testing success case'
    const mockValue = 42
    const fn = async (): Promise<number> => {
      await new Promise(resolve => setTimeout(resolve, 10))
      return mockValue
    }

    const result = await serverTiming.time(name, description, fn())
    expect(result).to.equal(mockValue)

    const [timingName, timingDuration, timingDesc] = serverTiming.getHeader().split(';')
    expect(timingName).to.equal(name)
    expect(timingDuration).to.match(/^dur=\d+(\.\d)?$/)
    expect(timingDesc).to.equal(`desc="${description}"`)
  })

  it('should return an error object with the correct header when fn throws', async () => {
    const name = 'testError'
    const description = 'Testing error case'
    const testError = new Error('Test failure')
    const fn = async (): Promise<never> => {
      throw testError
    }

    await expect(serverTiming.time(name, description, fn())).to.eventually.be.rejectedWith(testError)

    const [timingName, timingDuration, timingDesc] = serverTiming.getHeader().split(';')
    expect(timingName).to.equal(name)
    expect(timingDuration).to.match(/^dur=\d+(\.\d)?$/)
    expect(timingDesc).to.equal(`desc="${description}"`)
  })

  /**
   * This test checks that the duration is > 0, verifying that
   * we are measuring time between start and end.
   */
  it('should measure elapsed time accurately', async () => {
    const name = 'testTiming'
    const description = 'Testing timing measurement'
    const fn = async (): Promise<string> => {
      await new Promise(resolve => setTimeout(resolve, 20))
      return 'timing-check'
    }

    const result = await serverTiming.time(name, description, fn())
    expect(result).to.equal('timing-check')

    const [, timingDuration] = serverTiming.getHeader().split(';')
    const durationValue = Number(timingDuration.replace('dur=', ''))
    // round durationValue to nearest 10ms. On windows and firefox, a delay of 20ms returns ~19.x ms.
    expect(Math.round(durationValue / 10) * 10).to.be.greaterThanOrEqual(20).and.lessThanOrEqual(30)
  })

  describe('serverTiming with verified-fetch', () => {
    let vFetch: VerifiedFetch
    let helia: Helia
    let cid: CID

    beforeEach(async () => {
      helia = await createHelia()
      vFetch = await createVerifiedFetch(helia)
      cid = CID.createV1(raw.code, identity.digest(new Uint8Array()))
    })

    afterEach(async () => {
      await stop(helia)
    })

    it('response does not include server timing by default', async () => {
      const response = await vFetch(`https://example.com/ipfs/${cid}`)
      expect(response.headers.get('Server-Timing')).to.be.null()
    })

    it('can include one-off server timing headers in response', async () => {
      const response = await vFetch(`ipfs://${cid}`, {
        withServerTiming: true
      })
      expect(response.headers.get('Server-Timing')).to.be.a('string')
    })
  })
})
