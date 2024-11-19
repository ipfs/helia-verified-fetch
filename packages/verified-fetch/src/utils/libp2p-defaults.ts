import { kadDHT } from '@libp2p/kad-dht'
import { libp2pDefaults } from 'helia'
import { ipnsSelector } from 'ipns/selector'
import { ipnsValidator } from 'ipns/validator'
import type { Libp2pServices, VerifiedFetchLibp2p } from './libp2p-types.js'

export function getLibp2pConfig (): VerifiedFetchLibp2p {
  const libp2pDefaultOptions = libp2pDefaults()

  libp2pDefaultOptions.start = false

  const services: Libp2pServices = {
    autoNAT: libp2pDefaultOptions.services.autoNAT,
    dcutr: libp2pDefaultOptions.services.dcutr,
    identify: libp2pDefaultOptions.services.identify,
    keychain: libp2pDefaultOptions.services.keychain,
    ping: libp2pDefaultOptions.services.ping,
    upnp: libp2pDefaultOptions.services.upnp,
    dht: kadDHT({
      clientMode: true,
      validators: {
        ipns: ipnsValidator
      },
      selectors: {
        ipns: ipnsSelector
      }
    })
  }
  const libp2pOptions: VerifiedFetchLibp2p = {
    ...libp2pDefaultOptions,
    start: false,
    services
  }

  return libp2pOptions
}
