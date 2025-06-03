import { stubInterface } from 'sinon-ts'
import type { PeerId } from '@libp2p/interface'
import type { IPNSRecord } from 'ipns'
import type { StubbedInstance } from 'sinon-ts'

export interface IpnsRecordStubOptions {
  peerId: PeerId
  ttl?: bigint
}

/**
 * When stubbing an IPNSRecord, we need to provide a PeerId and some ttl value or else we will get
 * "SyntaxError: Cannot convert stub to a BigInt" when parse-url-string.ts calls `calculateTtl`
 */
export function ipnsRecordStub ({ peerId, ttl }: IpnsRecordStubOptions): StubbedInstance<IPNSRecord> {
  return stubInterface<IPNSRecord>({
    value: peerId.toString(),
    ttl
  })
}
