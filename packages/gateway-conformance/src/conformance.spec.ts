/* eslint-env mocha */
import { access, constants } from 'node:fs/promises'
import { prefixLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import expectedFailingTests from './expected-failing-tests.json' with { type: 'json' }
import expectedPassingTests from './expected-passing-tests.json' with { type: 'json' }
import { getReportDetails } from './get-report-details.js'

const logger = prefixLogger('gateway-conformance')

describe('@helia/verified-fetch - gateway conformance', function () {
  describe('conformance testing', () => {
    /**
     * You can see what the latest success rate, passing tests, and failing tests are by running the following command:
     *
     * ```
     * DEBUG="gateway-conformance*,gateway-conformance*:trace" SUCCESS_RATE=100 npm run test -- --bail false
     * ```
     */
    describe('gateway conformance', function () {
      let successRate: number
      let failingTests: string[]
      let passingTests: string[]
      const log = logger.forComponent('output:all')

      before(async function () {
        await expect(access('gwc-report-all.json', constants.R_OK)).to.eventually.be.fulfilled()
        const results = await getReportDetails('gwc-report-all.json')
        successRate = results.successRate
        failingTests = results.failingTests
        passingTests = results.passingTests

        log.trace('Passing tests:')
        for (const test of passingTests) {
          log.trace(`PASS: ${test}`)
        }
        log.trace('Failing tests:')
        for (const test of failingTests) {
          log.trace(`FAIL: ${test}`)
        }
      })

      for (const test of expectedPassingTests) {
        // eslint-disable-next-line no-loop-func
        it(`${test} Passes as expected`, () => {
          expect(passingTests).to.include(test)
        })
      }

      for (const test of expectedFailingTests) {
        // eslint-disable-next-line no-loop-func
        it(`${test} Fails as expected`, () => {
          expect(failingTests).to.include(test)
        })
      }

      const knownSuccessRate = 69.52
      it(`has expected success rate of ${knownSuccessRate}%`, () => {
        // check latest success rate with `SUCCESS_RATE=100 npm run test -- -g 'total'`
        const expectedSuccessRate = process.env.SUCCESS_RATE != null ? Number.parseFloat(process.env.SUCCESS_RATE) : knownSuccessRate
        expect(successRate).to.be.greaterThanOrEqual(expectedSuccessRate)
      })
    })
  })
})
