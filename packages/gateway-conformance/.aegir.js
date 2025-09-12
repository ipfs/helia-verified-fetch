// @ts-check
import getPort from 'aegir/get-port'
import { logger } from '@libp2p/logger'
const log = logger('aegir')

/** @type {import('aegir').PartialOptions} */
export default {
  build: {
    bundlesizeMax: '1KB'
  },
  test: {
    files: ['./dist/src/*.spec.js'],
    build: false,
    before: async (options) => {
      if (options.runner !== 'node') {
        throw new Error('Only node runner is supported')
      }
    }
  }
}
