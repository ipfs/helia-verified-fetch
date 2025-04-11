import { basename } from 'node:path'
import { $ } from 'execa'
import { glob } from 'glob'
import { path as kuboPath } from 'kubo'

/**
 * Only callable from node (intended to be consumed by .aegir.js)
 * but the fixtures loaded by this function are also used by browser tests.
 */
export async function loadFixtures (IPFS_PATH = undefined): Promise<void> {
  const kuboBinary = process.env.KUBO_BINARY ?? kuboPath()

  const carFiles = await glob('**/fixtures/data/*.car', { cwd: process.cwd() })
  const ipnsRecordFiles = await glob('**/fixtures/data/*.ipns-record', { cwd: process.cwd() })

  await Promise.allSettled(carFiles.map(async (carFile) => {
    await $({ env: { IPFS_PATH } })`${kuboBinary} dag import --pin-roots=false --offline ${carFile}`
  }))

  for (const ipnsRecord of ipnsRecordFiles) {
    const key = basename(ipnsRecord, '.ipns-record').split('_')[0]
    await $({ env: { IPFS_PATH } })`${kuboBinary} routing put --allow-offline /ipns/${key} ${ipnsRecord}`
  }
}
