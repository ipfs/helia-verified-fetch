import { $ } from 'execa'
import fg from 'fast-glob'
import { path as kuboPath } from 'kubo'

/**
 * Only callable from node (intended to be consumed by .aegir.js)
 * but the fixtures loaded by this function are also used by browser tests.
 */
export async function loadFixtures (IPFS_PATH = undefined): Promise<void> {
  const kuboBinary = process.env.KUBO_BINARY ?? kuboPath()
  /**
   * fast-glob does not like windows paths, see https://github.com/mrmlnc/fast-glob/issues/237
   * fast-glob performs search from process.cwd() by default, which will be:
   * 1. the root of the monorepo when running tests in CI
   * 2. the package root when running tests in the package directory
   */
  let globRoot = process.cwd().replace(/\\/g, '/')
  if (!globRoot.includes('packages/interop')) {
    // we only want car files from the interop package
    globRoot = [...globRoot.split('/'), 'packages/interop'].join('/')
  }
  for (const carFile of await fg.glob('src/fixtures/data/*.car', { cwd: globRoot })) {
    await $({ env: { IPFS_PATH } })`${kuboBinary} dag import --pin-roots=false --offline ${carFile}`
  }
}
