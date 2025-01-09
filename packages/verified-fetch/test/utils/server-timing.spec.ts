import { expect } from 'aegir/chai'
import { createVerifiedFetch, type VerifiedFetch } from '../../src/index.js'
import { serverTiming, type ServerTimingResult } from '../../src/utils/server-timing.js'
import { createHelia } from '../fixtures/create-offline-helia.js'

describe('serverTiming', () => {
  it('should return a success object with the correct header and no error', async () => {
    const name = 'testSuccess'
    const description = 'Testing success case'
    const mockValue = 42
    const fn = async (): Promise<number> => {
      await new Promise(resolve => setTimeout(resolve, 10))
      return mockValue
    }

    const result: ServerTimingResult<number> = await serverTiming(name, description, fn)

    expect(result.error).to.be.null()
    expect(result.result).to.equal(mockValue)
    expect(result.header).to.be.a('string')

    const [timingName, timingDuration, timingDesc] = result.header.split(';')
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

    const result: ServerTimingResult<never> = await serverTiming(name, description, fn)

    expect(result.result).to.be.null()
    expect(result.error).to.equal(testError)
    expect(result.header).to.be.a('string')

    const [timingName, timingDuration, timingDesc] = result.header.split(';')
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

    const result: ServerTimingResult<string> = await serverTiming(name, description, fn)
    expect(result.error).to.be.null()
    expect(result.result).to.equal('timing-check')

    const [, timingDuration] = result.header.split(';')
    const durationValue = Number(timingDuration.replace('dur=', ''))
    // round durationValue to nearest 10ms. On windows and firefox, a delay of 20ms returns ~19.x ms
    expect(Math.ceil(durationValue / 10) * 10).to.be.greaterThanOrEqual(20).and.lessThanOrEqual(30)
  })

  describe('serverTiming with verified-fetch', () => {
    let vFetch: VerifiedFetch
    before(async () => {
      vFetch = await createVerifiedFetch(await createHelia())
    })

    it('response does not include server timing by default', async () => {
      const response = await vFetch('https://example.com')
      expect(response.headers.get('Server-Timing')).to.be.null()
    })

    it('can include one-off server timing headers in response', async () => {
      const response = await vFetch('https://example.com', {
        includeServerTiming: true
      })
      expect(response.headers.get('Server-Timing')).to.be.a('string')
    })
  })
})
