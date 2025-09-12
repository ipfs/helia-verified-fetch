import { createHeliaHTTP } from '@helia/http'
import { MemoryBlockstore } from 'blockstore-core'
import { IdentityBlockstore } from 'blockstore-core/identity'
import { MemoryDatastore } from 'datastore-core'
import type { HeliaHTTPInit } from '@helia/http'

export async function createHelia (init: Partial<HeliaHTTPInit> = {}): Promise<ReturnType<typeof createHeliaHTTP>> {
  const datastore = new MemoryDatastore()
  const blockstore = new IdentityBlockstore(new MemoryBlockstore())

  const helia = await createHeliaHTTP({
    datastore,
    blockstore,
    blockBrokers: [],
    routers: [],
    ...init
  })

  await helia.start()

  return helia
}
