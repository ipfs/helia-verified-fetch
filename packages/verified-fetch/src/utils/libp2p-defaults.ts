import { libp2pDefaults } from '@helia/libp2p'
import type { ServiceFactoryMap } from './libp2p-types.ts'
import type { CreateLibp2pOptions, DefaultLibp2pServices } from '@helia/libp2p'
import type { Libp2pOptions } from 'libp2p'

type ServiceMap = Pick<DefaultLibp2pServices, 'autoNAT' | 'dcutr' | 'identify' | 'identifyPush' | 'keychain' | 'ping' | 'upnp'>

export function getLibp2pConfig (options?: CreateLibp2pOptions): Libp2pOptions & Required<Pick<Libp2pOptions, 'services'>> {
  // @ts-expect-error cannot derive correct type
  const libp2pDefaultOptions = libp2pDefaults(options)

  const services: ServiceFactoryMap<ServiceMap> = {
    autoNAT: libp2pDefaultOptions.services.autoNAT,
    dcutr: libp2pDefaultOptions.services.dcutr,
    identify: libp2pDefaultOptions.services.identify,
    identifyPush: libp2pDefaultOptions.services.identifyPush,
    keychain: libp2pDefaultOptions.services.keychain,
    ping: libp2pDefaultOptions.services.ping,
    upnp: libp2pDefaultOptions.services.upnp
  }

  return {
    ...libp2pDefaultOptions,
    services
  }
}
