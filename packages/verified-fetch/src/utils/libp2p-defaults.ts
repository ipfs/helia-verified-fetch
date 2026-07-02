import { kadDHT } from '@libp2p/kad-dht'
import { libp2pDefaults } from '@helia/libp2p'
import type { ServiceFactoryMap } from './libp2p-types.ts'
import type { DefaultLibp2pServices } from '@helia/libp2p'
import type { Libp2pOptions } from 'libp2p'

type ServiceMap = Pick<DefaultLibp2pServices, 'autoNAT' | 'dcutr' | 'dht' | 'identify' | 'keychain' | 'ping' | 'upnp'>

export function getLibp2pConfig (): Libp2pOptions & Required<Pick<Libp2pOptions, 'services'>> {
  const libp2pDefaultOptions = libp2pDefaults()

  libp2pDefaultOptions.start = false

  const services: ServiceFactoryMap<ServiceMap> = {
    autoNAT: libp2pDefaultOptions.services.autoNAT,
    dcutr: libp2pDefaultOptions.services.dcutr,
    dht: kadDHT({
      clientMode: true
    }),
    identify: libp2pDefaultOptions.services.identify,
    keychain: libp2pDefaultOptions.services.keychain,
    ping: libp2pDefaultOptions.services.ping,
    upnp: libp2pDefaultOptions.services.upnp
  }

  return {
    ...libp2pDefaultOptions,
    start: false,
    services
  }
}
