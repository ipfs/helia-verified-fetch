import * as dagCbor from '@ipld/dag-cbor'
import * as dagJson from '@ipld/dag-json'
import { createHeliaLight } from 'helia'
import * as json from 'multiformats/codecs/json'
import { raceSignal } from 'race-signal'
import type { Helia, SessionBlockBroker } from '@helia/interface'
import type { HeliaInit } from 'helia'

export async function createHelia (init: HeliaInit = {}): Promise<Helia> {
  const abortingBlockBroker: SessionBlockBroker = {
    name: 'aborting-block-broker',

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
    },

    createSession () {
      return this
    },

    async addPeer () {

    }
  }

  const helia = await createHeliaLight({
    blockBrokers: [
      () => abortingBlockBroker
    ],
    routers: [],
    codecs: [
      dagCbor,
      dagJson,
      json
    ],
    ...init
  }).start()

  return helia
}
