import { expect } from 'aegir/chai'
import { serverTiming, type ServerTimingResult } from '../../src/utils/server-timing.js'

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
    expect(durationValue).to.be.greaterThan(20).and.lessThan(30)
  })
})