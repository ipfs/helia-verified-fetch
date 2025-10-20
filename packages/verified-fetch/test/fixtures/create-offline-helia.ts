import { createHeliaHTTP } from '@helia/http'
import { raceSignal } from 'race-signal'
import type { HeliaHTTPInit } from '@helia/http'

export async function createHelia (init: Partial<HeliaHTTPInit> = {}): Promise<ReturnType<typeof createHeliaHTTP>> {
  const helia = await createHeliaHTTP({
    blockBrokers: [
      () => {
        return {
          // a block broker that fails to find a block after a few seconds
          retrieve: async (cid, options) => {
            return raceSignal(new Promise((resolve, reject) => {
              const onAbort = (): void => {
                clearTimeout(timeout)
              }

              const timeout = setTimeout(() => {
                options?.signal?.removeEventListener('abort', onAbort)
                reject(new Error(`Dummy block broker could not fetch CID ${cid}`))
              }, 5_000)

              options?.signal?.addEventListener('abort', onAbort, {
                once: true
              })
            }), options?.signal)
          }
        }
      }
    ],
    routers: [],
    ...init
  })

  await helia.start()

  return helia
}
