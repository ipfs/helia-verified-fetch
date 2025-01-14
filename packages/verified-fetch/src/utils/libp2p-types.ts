import type { DelegatedRoutingV1HttpApiClient } from '@helia/delegated-routing-v1-http-api-client'
import type { ServiceMap } from '@libp2p/interface'

type DelegatedRoutingServices = Record<`delegatedRouting${number}`, ((components?: unknown) => DelegatedRoutingV1HttpApiClient)>

export type ServiceFactoryMap<T extends ServiceMap = ServiceMap> = {
  [Property in keyof T]: (components: any & T) => T[Property]
} & DelegatedRoutingServices
