import { CID } from 'multiformats/cid'
import { parseUrlString } from './parse-url-string.js'
import type { ParseUrlStringOptions, ParsedUrlStringResults } from './parse-url-string.js'
import type { Resource } from '../index.js'
import type { IPNS } from '@helia/ipns'
import type { ComponentLogger } from '@libp2p/interface'

export interface ParseResourceComponents {
  ipns: IPNS
  logger: ComponentLogger
}

export interface ParseResourceOptions extends ParseUrlStringOptions {
  withServerTiming?: boolean
}
/**
 * Handles the different use cases for the `resource` argument.
 * The resource can represent an IPFS path, IPNS path, or CID.
 * If the resource represents an IPNS path, we need to resolve it to a CID.
 */
export async function parseResource (resource: Resource, { ipns, logger }: ParseResourceComponents, { withServerTiming = false, ...options }: ParseResourceOptions = { withServerTiming: false }): Promise<ParsedUrlStringResults> {
  if (typeof resource === 'string') {
    return parseUrlString({ urlString: resource, ipns, logger, withServerTiming }, options)
  }

  const cid = CID.asCID(resource)

  if (cid != null) {
    // an actual CID
    return {
      cid,
      protocol: 'ipfs',
      path: '',
      query: {},
      ipfsPath: `/ipfs/${cid.toString()}`,
      ttl: 29030400, // 1 year for ipfs content
      serverTimings: []
    } satisfies ParsedUrlStringResults
  }

  throw new TypeError(`Invalid resource. Cannot determine CID from resource: ${resource}`)
}
