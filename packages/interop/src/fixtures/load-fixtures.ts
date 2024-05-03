import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { $ } from 'execa'
import fg from 'fast-glob'
import { path as kuboPath } from 'kubo'

/**
 * Only callable from node (intended to be consumed by .aegir.js)
 * but the fixtures loaded by this function are also used by browser tests.
 */
export async function loadFixtures (IPFS_PATH = undefined): Promise<void> {
  const scriptDir = dirname(fileURLToPath(import.meta.url)) // dist/src, but car files are in src/fixtures/data

  const kuboBinary = process.env.KUBO_BINARY ?? kuboPath()
  for (const carFile of await fg.glob([`${resolve(scriptDir, '../../../src/fixtures/data')}/**/*.car`])) {
    await $({ env: { IPFS_PATH } })`${kuboBinary} dag import --pin-roots=false --offline ${carFile}`
  }
}
