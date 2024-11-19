import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { createDelegatedRoutingV1HttpApiClient, type DelegatedRoutingV1HttpApiClient } from '@helia/delegated-routing-v1-http-api-client'
import { autoNAT } from '@libp2p/autonat'
import { bootstrap } from '@libp2p/bootstrap'
import { circuitRelayTransport, circuitRelayServer, type CircuitRelayService } from '@libp2p/circuit-relay-v2'
import { dcutr } from '@libp2p/dcutr'
import { type Identify, identify, identifyPush } from '@libp2p/identify'
import { type KadDHT, kadDHT } from '@libp2p/kad-dht'
import { keychain, type Keychain } from '@libp2p/keychain'
import { mplex } from '@libp2p/mplex'
import { ping, type PingService } from '@libp2p/ping'
import { tcp } from '@libp2p/tcp'
import { tls } from '@libp2p/tls'
import { uPnPNAT } from '@libp2p/upnp-nat'
import { webRTCDirect } from '@libp2p/webrtc'
import { webSockets } from '@libp2p/websockets'
import { type DNS } from '@multiformats/dns'
import { ipnsSelector } from 'ipns/selector'
import { ipnsValidator } from 'ipns/validator'
import * as libp2pInfo from 'libp2p/version'
import { type CreateVerifiedFetchInit } from '..'
import type { Libp2pOptions } from 'libp2p'

export interface Libp2pServices extends Record<string, any> {
  autoNAT: unknown
  dcutr: unknown
  dht: KadDHT
  identify: Identify
  keychain: Keychain
  ping: PingService
  relay: CircuitRelayService
  upnp: unknown
  [key: `delegatedRouting${number}`]: DelegatedRoutingV1HttpApiClient
}

export const bootstrapConfig = {
  list: [
    '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
    '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
    '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt',
    // va1 is not in the TXT records for _dnsaddr.bootstrap.libp2p.io yet
    // so use the host name directly
    '/dnsaddr/va1.bootstrap.libp2p.io/p2p/12D3KooWKnDdG3iXw9eTFijk3EWSunZcFi54Zka4wmtqtt6rPxc8',
    '/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ'
  ]
}

type Libp2pOptionsInit = Pick<CreateVerifiedFetchInit, 'routers'> & { dns?: DNS }

export function getLibp2pConfig (options: Libp2pOptionsInit): Libp2pOptions<Libp2pServices> {
  const agentVersion = `@helia/verified-fetch ${libp2pInfo.name}/${libp2pInfo.version} UserAgent=${process.version}`

  const config = {
    dns: options.dns,
    start: false,
    addresses: {
      listen: [
        '/ip4/0.0.0.0/tcp/0',
        '/ip6/::/tcp/0',
        '/p2p-circuit'
      ]
    },
    transports: [
      circuitRelayTransport(),
      tcp(),
      webRTCDirect(),
      webSockets()
    ],
    connectionEncrypters: [
      noise(),
      tls()
    ],
    streamMuxers: [
      yamux(),
      mplex()
    ],
    peerDiscovery: [
      bootstrap(bootstrapConfig)
    ],
    services: {
      autoNAT: autoNAT(),
      dcutr: dcutr(),
      dht: kadDHT({
        validators: {
          ipns: ipnsValidator
        },
        selectors: {
          ipns: ipnsSelector
        }
      }),
      identify: identify({
        agentVersion
      }),
      identifyPush: identifyPush({
        agentVersion
      }),
      keychain: keychain(),
      ping: ping(),
      relay: circuitRelayServer(),
      upnp: uPnPNAT()
    }
  }
  const routers = options?.routers ?? ['https://delegated-ipfs.dev']
  for (let index = 0; index < routers.length; index++) {
    const routerUrl = routers[index]
    // @ts-expect-error for some reason the types are not working here
    config.services[`delegatedRouting${index}`] = createDelegatedRoutingV1HttpApiClient(routerUrl) // TODO: add filters
  }

  return config
}
