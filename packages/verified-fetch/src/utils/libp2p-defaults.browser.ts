import { webRTCDirect } from '@libp2p/webrtc'
import { webSockets } from '@libp2p/websockets'
import { libp2pDefaults, type DefaultLibp2pServices } from 'helia'
import type { ServiceFactoryMap } from './libp2p-types'
import type { Libp2pOptions } from 'libp2p'

type ServiceMap = Pick<DefaultLibp2pServices, 'dcutr' | 'identify' | 'keychain' | 'ping'>

export function getLibp2pConfig (): Libp2pOptions & Required<Pick<Libp2pOptions, 'services'>> {
  const libp2pDefaultOptions = libp2pDefaults()

  libp2pDefaultOptions.start = false
  libp2pDefaultOptions.addresses = { listen: [] }
  libp2pDefaultOptions.transports = [webRTCDirect(), webSockets()]
  libp2pDefaultOptions.peerDiscovery = [] // Avoid connecting to bootstrap nodes

  const services: ServiceFactoryMap<ServiceMap> = {
    dcutr: libp2pDefaultOptions.services.dcutr,
    identify: libp2pDefaultOptions.services.identify,
    keychain: libp2pDefaultOptions.services.keychain,
    ping: libp2pDefaultOptions.services.ping
  }

  return {
    ...libp2pDefaultOptions,
    start: false,
    services
  }
}
