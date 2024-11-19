import type { DelegatedRoutingV1HttpApiClient } from '@helia/delegated-routing-v1-http-api-client'
import type { ServiceMap } from '@libp2p/interface'
import type { DefaultLibp2pServices } from 'helia'
import type { Libp2pOptions } from 'libp2p'

type BaseServiceMap = Record<string, unknown>
type DelegatedRoutingServices = Record<`delegatedRouting${number}`, unknown | ((components?: unknown) => DelegatedRoutingV1HttpApiClient)>

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
export interface Libp2pServices extends BaseServiceMap, DelegatedRoutingServices {
  [key: string]: any
}
// type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

interface Libp2pInitOverride<T extends ServiceMap = Libp2pServices & DefaultLibp2pServices> extends Omit<Libp2pOptions<T>, 'services'> {
  services: Libp2pServices
  start?: boolean
}

export type VerifiedFetchLibp2p = Libp2pInitOverride<Libp2pServices> & Pick<Libp2pInitOverride<Libp2pServices>, 'services'>
