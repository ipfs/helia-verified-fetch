import { CodeError } from '@libp2p/interface'
import { walkPath as exporterWalk, type ExporterOptions, type ReadableStorage, type ObjectNode, type UnixFSEntry } from 'ipfs-unixfs-exporter'
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

export async function walkPath (blockstore: ReadableStorage, path: string, options?: PathWalkerOptions): Promise<PathWalkerResponse> {
  const ipfsRoots: CID[] = []
  let terminalElement: UnixFSEntry | undefined

  for await (const entry of exporterWalk(path, blockstore, options)) {
    ipfsRoots.push(entry.cid)
    terminalElement = entry
  }

  if (terminalElement == null) {
    throw new CodeError('No terminal element found', 'NO_TERMINAL_ELEMENT')
  }

  return {
    ipfsRoots,
    terminalElement
  }
}

export function objectNodeGuard (node: UnixFSEntry): node is ObjectNode {
  return node.type === 'object'
}
