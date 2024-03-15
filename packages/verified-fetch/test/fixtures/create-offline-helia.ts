import { Helia as HeliaClass } from '@helia/utils'
import { MemoryBlockstore } from 'blockstore-core'
import { MemoryDatastore } from 'datastore-core'
import type { HeliaHTTPInit } from '@helia/http'
import type { Helia } from '@helia/interface'

export async function createHelia (init: Partial<HeliaHTTPInit> = {}): Promise<Helia> {
  const datastore = new MemoryDatastore()
  const blockstore = new MemoryBlockstore()

  const helia = new HeliaClass({
    datastore,
    blockstore,
    blockBrokers: [],
    routers: [],
    ...init
  })

  await helia.start()

  return helia
}
