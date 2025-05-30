import { DoesNotExistError } from '@helia/unixfs/errors'
import { AbortError } from '@libp2p/interface'
import { walkPath as exporterWalk } from 'ipfs-unixfs-exporter'
import { badGatewayResponse, notFoundResponse } from './responses.js'
import type { PluginContext } from '../plugins/types.js'
import type { Logger } from '@libp2p/interface'
import type { Blockstore } from 'interface-blockstore'
import type { ExporterOptions, ReadableStorage, ObjectNode, UnixFSEntry } from 'ipfs-unixfs-exporter'
import type { CID } from 'multiformats/cid'

export interface PathWalkerOptions extends ExporterOptions {

}
export interface PathWalkerResponse {
  ipfsRoots: CID[]
  terminalElement: UnixFSEntry
}

export interface PathWalkerFn {
  (blockstore: ReadableStorage, path: string, options?: PathWalkerOptions): Promise<PathWalkerResponse>
}

async function walkPath (blockstore: ReadableStorage, path: string, options?: PathWalkerOptions): Promise<PathWalkerResponse> {
  const ipfsRoots: CID[] = []
  let terminalElement: UnixFSEntry | undefined

  for await (const entry of exporterWalk(path, blockstore, options)) {
    ipfsRoots.push(entry.cid)
    terminalElement = entry
  }

  if (terminalElement == null) {
    throw new DoesNotExistError('No terminal element found')
  }

  return {
    ipfsRoots,
    terminalElement
  }
}

export function isObjectNode (node: UnixFSEntry): node is ObjectNode {
  return node.type === 'object'
}

/**
 * Attempts to walk the path in the blockstore, returning ipfsRoots needed to resolve the path, and the terminal element.
 * If the signal is aborted, the function will throw an AbortError
 * If a terminal element is not found, a notFoundResponse is returned
 * If another unknown error occurs, a badGatewayResponse is returned
 *
 */
export async function handlePathWalking ({ cid, path, resource, options, blockstore, log }: PluginContext & { blockstore: Blockstore, log: Logger }): Promise<PathWalkerResponse | Response> {
  try {
    return await walkPath(blockstore, `${cid.toString()}/${path}`, options)
  } catch (err: any) {
    if (options?.signal?.aborted) {
      throw new AbortError(options?.signal?.reason)
    }

    if (['ERR_NO_PROP', 'ERR_NO_TERMINAL_ELEMENT', 'ERR_NOT_FOUND'].includes(err.code)) {
      return notFoundResponse(resource)
    }

    log.error('error walking path %s', path, err)
    return badGatewayResponse(resource, 'Error walking path')
  }
}
