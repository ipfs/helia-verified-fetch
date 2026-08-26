import { libp2pDefaults } from '@helia/libp2p'
import { webRTCDirect } from '@libp2p/webrtc'
import { webSockets } from '@libp2p/websockets'
import type { ServiceFactoryMap } from './libp2p-types.ts'
import type { DefaultLibp2pServices } from '@helia/libp2p'
import type { Libp2pOptions } from 'libp2p'

type ServiceMap = Pick<DefaultLibp2pServices, 'dcutr' | 'identify' | 'identifyPush' | 'keychain' | 'ping'>

export function getLibp2pConfig (): Libp2pOptions & Required<Pick<Libp2pOptions, 'services'>> {
  const libp2pDefaultOptions = libp2pDefaults()
  const services: ServiceFactoryMap<ServiceMap> = {
    dcutr: libp2pDefaultOptions.services.dcutr,
    identify: libp2pDefaultOptions.services.identify,
    identifyPush: libp2pDefaultOptions.services.identifyPush,
    keychain: libp2pDefaultOptions.services.keychain,
    ping: libp2pDefaultOptions.services.ping
  }

  return {
    addresses: {
      listen: []
    },
    transports: [
      webRTCDirect(),
      webSockets()
    ],
    peerDiscovery: [
      // Avoid connecting to bootstrap nodes
    ],
    services
  }
}
