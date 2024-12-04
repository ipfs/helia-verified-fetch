/** @type {import('aegir').PartialOptions} */
const options = {
  dependencyCheck: {
    ignore: [
      '@multiformats/blake2'
    ]
  },
  build: {
    bundlesizeMax: '132KB'
  }
}

export default options
