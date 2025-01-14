import { $ } from 'execa'
import { glob } from 'glob'
import { path as kuboPath } from 'kubo'

/**
 * Only callable from node (intended to be consumed by .aegir.js)
 * but the fixtures loaded by this function are also used by browser tests.
 */
export async function loadFixtures (IPFS_PATH = undefined): Promise<void> {
  const kuboBinary = process.env.KUBO_BINARY ?? kuboPath()

  const files = await glob('**/fixtures/data/*.car', { cwd: process.cwd() })

  await Promise.allSettled(files.map(async (carFile) => {
    await $({ env: { IPFS_PATH } })`${kuboBinary} dag import --pin-roots=false --offline ${carFile}`
  }))
}
