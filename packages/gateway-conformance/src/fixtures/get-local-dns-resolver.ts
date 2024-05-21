import { logger } from '@libp2p/logger'
import { type Answer, type Question } from '@multiformats/dns'
import { type DNSResolver } from '@multiformats/dns/resolvers'

export function getLocalDnsResolver (ipfsNsMap: string, kuboGateway: string): DNSResolver {
  const log = logger('basic-server:dns')
  const nsMap = new Map<string, string>()
  const keyVals = ipfsNsMap.split(',')
  for (const keyVal of keyVals) {
    const [key, val] = keyVal.split(':')
    log('Setting entry: %s="%s"', key, val)
    nsMap.set(key, val)
  }

  // async function getNameFromKubo (name: string): Promise<string> {
  //   try {
  //     log.trace('Fetching peer record for %s from Kubo', name)
  //     const peerResponse = await fetch(`${kuboGateway}/api/v0/name/resolve?arg=${name}`, { method: 'POST' })
  //     // invalid .json(), see https://github.com/ipfs/kubo/issues/10428
  //     const text = (await peerResponse.text()).trim()
  //     log('response from Kubo: %s', text)
  //     const peerJson = JSON.parse(text)
  //     return peerJson.Path
  //   } catch (err: any) {
  //     log.error('Problem fetching peer record from kubo: %s', err.message, err)
  //     // process.exit(1)
  //     throw err
  //   }
  // }

  // /**
  //  * @see https://docs.ipfs.tech/reference/kubo/rpc/#api-v0-resolve
  //  */
  // async function getPeerRecordFromKubo (peerId: string): Promise<string> {
  //   try {
  //     log.trace('Fetching peer record for %s from Kubo', peerId)
  //     const peerResponse = await fetch(`${kuboGateway}/api/v0/resolve/${peerId}`, { method: 'POST' })
  //     // invalid .json(), see https://github.com/ipfs/kubo/issues/10428
  //     const text = (await peerResponse.text()).trim()
  //     log('response from Kubo: %s', text)
  //     const peerJson = JSON.parse(text)
  //     return peerJson.Path
  //   } catch (err: any) {
  //     log.error('Problem fetching peer record from kubo: %s', err.message, err)
  //     // process.exit(1)
  //     return getNameFromKubo(peerId)
  //   }
  // }

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
      // try {
      //   await getPeerRecordFromKubo(actualDomainKey)
      // await getNameFromKubo(actualDomainKey)
      if (nsValue == null) {
        log.error('No IPFS_NS_MAP entry for domain "%s"', actualDomainKey)
        // try to query kubo for the record
        // temporarily disabled because it can cause an infinite loop
        // await getPeerRecordFromKubo(actualDomainKey)

        throw new Error('No IPFS_NS_MAP entry for domain')
      }
      const data = `dnslink=${nsValue}`
      answers.push({
        name: domain,
        type: 16,
        TTL: 180,
        data // should be in the format 'dnslink=/ipfs/bafkqac3imvwgy3zao5xxe3de'
      })
      // } catch (err: any) {
      //   log.error('Problem resolving record: %s', err.message, err)
      // }
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
