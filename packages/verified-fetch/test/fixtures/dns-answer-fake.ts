import { stubInterface } from 'sinon-ts'
import type { DNSResponse } from '@multiformats/dns'

export function answerFake (data: string, TTL: number, name: string, type: number): DNSResponse {
  const fake = stubInterface<DNSResponse>()
  fake.Answer = [{
    data,
    TTL,
    name,
    type
  }]
  return fake
}
