import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { createDelegatedRoutingV1HttpApiClient, type DelegatedRoutingV1HttpApiClient } from '@helia/delegated-routing-v1-http-api-client'
import { dcutr } from '@libp2p/dcutr'
import { type Identify, identify } from '@libp2p/identify'
import { keychain, type Keychain } from '@libp2p/keychain'
import { mplex } from '@libp2p/mplex'
import { ping, type PingService } from '@libp2p/ping'
import { webRTCDirect } from '@libp2p/webrtc'
import { webSockets } from '@libp2p/websockets'
import { type DNS } from '@multiformats/dns'
import * as libp2pInfo from 'libp2p/version'
import { type CreateVerifiedFetchInit } from '..'
import type { Libp2pOptions } from 'libp2p'

export interface Libp2pServices extends Record<string, any> {
  dcutr: unknown
  identify: Identify
  keychain: Keychain
  ping: PingService
  [key: `delegatedRouting${number}`]: DelegatedRoutingV1HttpApiClient
}

type Libp2pOptionsInit = Pick<CreateVerifiedFetchInit, 'routers'> & { dns?: DNS }

export function getLibp2pConfig (options: Libp2pOptionsInit): Libp2pOptions<Libp2pServices> {
  const agentVersion = `@helia/verified-fetch ${libp2pInfo.name}/${libp2pInfo.version} UserAgent=${globalThis.navigator.userAgent}`

  const config = {
    dns: options.dns,
    start: false,
    addresses: {
      listen: []
    },
    transports: [
      webRTCDirect(),
      webSockets()
    ],
    connectionEncrypters: [
      noise()
    ],
    streamMuxers: [
      yamux(),
      mplex()
    ],
    peerDiscovery: [], // don't connect to anyone by default
    // We only need client/listen/fetch based services
    services: {
      dcutr: dcutr(),
      identify: identify({
        agentVersion
      }),
      keychain: keychain(),
      ping: ping()
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
