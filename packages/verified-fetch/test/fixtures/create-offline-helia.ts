import { createHeliaHTTP } from '@helia/http'
import { MemoryBlockstore } from 'blockstore-core'
import { IdentityBlockstore } from 'blockstore-core/identity'
import { MemoryDatastore } from 'datastore-core'

export async function createHelia (...args: Parameters<typeof createHeliaHTTP>): Promise<ReturnType<typeof createHeliaHTTP>> {
  const [init] = args
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
