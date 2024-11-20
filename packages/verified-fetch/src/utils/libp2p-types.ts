import type { DelegatedRoutingV1HttpApiClient } from '@helia/delegated-routing-v1-http-api-client'
import type { ServiceMap } from '@libp2p/interface'
import type { DefaultLibp2pServices } from 'helia'
import type { Libp2pOptions } from 'libp2p'

type BaseServiceMap = Record<string, unknown>
type DelegatedRoutingServices = Record<`delegatedRouting${number}`, ((components?: unknown) => DelegatedRoutingV1HttpApiClient)>

export type Libp2pServices<T extends ServiceMap = ServiceMap> = {
  [Property in keyof T]: (components: any & T) => T[Property]
} & BaseServiceMap & DelegatedRoutingServices

interface Libp2pInitOverride<T extends ServiceMap = Libp2pServices & DefaultLibp2pServices> extends Omit<Libp2pOptions<T>, 'services'> {
  services: Libp2pServices
  start?: boolean
}

export type VerifiedFetchLibp2p = Libp2pInitOverride<Libp2pServices> & Pick<Libp2pInitOverride<Libp2pServices>, 'services'>
