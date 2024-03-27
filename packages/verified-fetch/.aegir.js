/** @type {import('aegir').PartialOptions} */
const options = {
  build: {
    bundlesizeMax: '132KB',
    config: {
      external: [
        'ipfs-unixfs-importer'
      ],
    }
  },
}

export default options
