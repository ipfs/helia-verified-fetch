import browserReadableStreamToIt from 'browser-readablestream-to-it'
import first from 'it-first'
import { verifiedFetch } from './dist/src/index.js'

const controller = new AbortController()
const signal = controller.signal
const start = performance.now()
const response = await verifiedFetch('/ipfs/bafybeidsp6fva53dexzjycntiucts57ftecajcn5omzfgjx57pqfy3kwbq', { signal })

// expect(response.status).to.equal(200)
const end = performance.now()
const timeToResponse = end - start
// expect(timeToResponse).to.be.lessThan(2000)
if (response.body == null) {
  throw new Error('response.body is null')
}
const startByte = performance.now()
await first(browserReadableStreamToIt(response.body))
const endByte = performance.now()
const timeToFirstByte = endByte - startByte
// expect(timeToFirstByte).to.be.lessThan(1000)
// eslint-disable-next-line no-console
console.log('TTR: %s, TTFB: %s', timeToResponse, timeToFirstByte)

await verifiedFetch.stop()
controller.abort()
