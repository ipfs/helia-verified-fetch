import { webRTCDirect } from '@libp2p/webrtc'
import { webSockets } from '@libp2p/websockets'
import { libp2pDefaults } from 'helia'
import type { Libp2pServices, VerifiedFetchLibp2p } from './libp2p-types.js'

export function getLibp2pConfig (): VerifiedFetchLibp2p {
  const libp2pDefaultOptions = libp2pDefaults()

  libp2pDefaultOptions.start = false
  libp2pDefaultOptions.addresses = { listen: [] }
  libp2pDefaultOptions.transports = [webRTCDirect(), webSockets()]

  const services: Libp2pServices = {
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
