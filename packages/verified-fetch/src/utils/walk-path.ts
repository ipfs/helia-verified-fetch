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

  try {
    for await (const entry of exporterWalk(path, blockstore, options)) {
      ipfsRoots.push(entry.cid)
      terminalElement = entry
    }
  } catch (err: any) {
    if (err.errors?.length > 0) {
      for (const error of err.errors) {
        if (error.code === 'ERR_NO_ROUTERS_AVAILABLE') {
          throw error
        }
      }
    }
    throw err
  }

  if (terminalElement == null) {
    throw new CodeError('No terminal element found', 'ERR_NO_TERMINAL_ELEMENT')
  }

  return {
    ipfsRoots,
    terminalElement
  }
}

export function isObjectNode (node: UnixFSEntry): node is ObjectNode {
  return node.type === 'object'
}
