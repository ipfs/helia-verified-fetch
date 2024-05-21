import { MemoryDatastore } from 'datastore-core'
import type { Datastore } from 'interface-datastore'

const datastore = new MemoryDatastore()
/**
 * We need a normalized datastore so we can set custom records
 * from the IPFS_NS_MAP like kubo does.
 */
export function getIpnsRecordDatastore (): Datastore {
  return datastore
}
