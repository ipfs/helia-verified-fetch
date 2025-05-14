import { logger } from '@libp2p/logger'
import type { Answer, Question } from '@multiformats/dns'
import type { DNSResolver } from '@multiformats/dns/resolvers'

export function getLocalDnsResolver (ipfsNsMap: string, kuboGateway: string): DNSResolver {
  const log = logger('basic-server:dns')
  const nsMap = new Map<string, string>()
  const keyVals = ipfsNsMap.split(',')
  for (const keyVal of keyVals) {
    const [key, val] = keyVal.split(':')
    log('Setting entry: %s="%s"', key, val)
    nsMap.set(key, val)
  }

  return async (domain, options) => {
    const questions: Question[] = []
    const answers: Answer[] = []

    if (Array.isArray(options?.types)) {
      options?.types?.forEach?.((type) => {
        questions.push({ name: domain, type })
      })
    } else {
      questions.push({ name: domain, type: options?.types ?? 16 })
    }
    // TODO: do we need to do anything with CNAME resolution...?
    // if (questions.some((q) => q.type === 5)) {
    //   answers.push({
    //     name: domain,
    //     type: 5,
    //     TTL: 180,
    //     data: ''
    //   })
    // }
    if (questions.some((q) => q.type === 16)) {
      log.trace('Querying "%s" for types %O', domain, options?.types)
      const actualDomainKey = domain.replace('_dnslink.', '')
      const nsValue = nsMap.get(actualDomainKey)
      if (nsValue == null) {
        log.error('No IPFS_NS_MAP entry for domain "%s"', actualDomainKey)

        throw new Error('No IPFS_NS_MAP entry for domain')
      }
      const data = `dnslink=${nsValue}`
      answers.push({
        name: domain,
        type: 16,
        TTL: 180,
        data // should be in the format 'dnslink=/ipfs/bafkqac3imvwgy3zao5xxe3de'
      })
    }

    const dnsResponse = {
      Status: 0,
      TC: false,
      RD: false,
      RA: false,
      AD: true,
      CD: true,
      Question: questions,
      Answer: answers
    }

    log.trace('Returning DNS response for %s: %O', domain, dnsResponse)

    return dnsResponse
  }
}
