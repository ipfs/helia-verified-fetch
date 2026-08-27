import { libp2pDefaults } from '@helia/libp2p'
import { webRTCDirect } from '@libp2p/webrtc'
import { webSockets } from '@libp2p/websockets'
import type { ServiceFactoryMap } from './libp2p-types.ts'
import type { CreateLibp2pOptions, DefaultLibp2pServices } from '@helia/libp2p'
import type { Libp2pOptions } from 'libp2p'

type ServiceMap = Pick<DefaultLibp2pServices, 'dcutr' | 'identify' | 'identifyPush' | 'keychain' | 'ping'>

export function getLibp2pConfig (options?: CreateLibp2pOptions): Libp2pOptions & Required<Pick<Libp2pOptions, 'services'>> {
  // @ts-expect-error cannot derive correct type
  const libp2pDefaultOptions = libp2pDefaults(options)

  libp2pDefaultOptions.start = false
  libp2pDefaultOptions.addresses = { listen: [] }
  libp2pDefaultOptions.transports = [webRTCDirect(), webSockets()]
  libp2pDefaultOptions.peerDiscovery = [] // Avoid connecting to bootstrap nodes

  const services: ServiceFactoryMap<ServiceMap> = {
    dcutr: libp2pDefaultOptions.services.dcutr,
    identify: libp2pDefaultOptions.services.identify,
    identifyPush: libp2pDefaultOptions.services.identifyPush,
    keychain: libp2pDefaultOptions.services.keychain,
    ping: libp2pDefaultOptions.services.ping
  }

  return {
    ...libp2pDefaultOptions,
    start: false,
    services
  }
}
