import { DoesNotExistError } from '@helia/unixfs/errors'
import * as dagCbor from '@ipld/dag-cbor'
import * as dagJson from '@ipld/dag-json'
import * as dagPb from '@ipld/dag-pb'
import { walkPath as exporterWalk } from 'ipfs-unixfs-exporter'
import toBuffer from 'it-to-buffer'
import * as json from 'multiformats/codecs/json'
import * as raw from 'multiformats/codecs/raw'
import { CODEC_CBOR, CODEC_IDENTITY } from '../constants.ts'
import { badGatewayResponse, notFoundResponse } from './responses.js'
import type { Logger } from '@libp2p/interface'
import type { Blockstore } from 'interface-blockstore'
import type { ExporterOptions, ReadableStorage, ObjectNode, UnixFSEntry } from 'ipfs-unixfs-exporter'
import type { CID } from 'multiformats/cid'

export interface PathWalkerOptions extends ExporterOptions {

}

export interface RequestPath {
  ipfsRoots: CID[]
  terminalElement: UnixFSEntry
}

export interface PathWalkerFn {
  (blockstore: ReadableStorage, path: string, options?: PathWalkerOptions): Promise<RequestPath>
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
async function handlePathWalking (cid: CID, path: string, resource: string, blockstore: Blockstore, log: Logger, options: PathWalkerOptions): Promise<RequestPath | Response> {
  try {
    const ipfsRoots: CID[] = []
    let terminalElement: UnixFSEntry | undefined

    for await (const entry of exporterWalk(`${cid}${path}`, blockstore, options)) {
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
  } catch (err: any) {
    options?.signal?.throwIfAborted()

    if (['ERR_NO_PROP', 'ERR_NO_TERMINAL_ELEMENT', 'ERR_NOT_FOUND'].includes(err.code)) {
      return notFoundResponse(resource)
    }

    log.error('error walking path "%s" - %e', path, err)
    return badGatewayResponse(resource, 'Error walking path')
  }
}

const ENTITY_CODECS = [
  CODEC_CBOR,
  json.code,
  raw.code
]

/**
 * These are supported by the UnixFS exporter
 */
const EXPORTABLE_CODECS = [
  dagPb.code,
  dagCbor.code,
  dagJson.code,
  raw.code
]

export async function walkPath (cid: CID, path: string, resource: string, blockstore: Blockstore, log: Logger, options: PathWalkerOptions = {}): Promise<RequestPath | Response> {
  if (EXPORTABLE_CODECS.includes(cid.code)) {
    return handlePathWalking(cid, path, resource, blockstore, log, options)
  }

  let bytes: Uint8Array

  if (cid.multihash.code === CODEC_IDENTITY) {
    bytes = cid.multihash.digest
  } else {
    bytes = await toBuffer(blockstore.get(cid, options))
  }

  // entity codecs contain all the bytes for an entity in one block and no
  // path walking outside of that block is possible
  if (ENTITY_CODECS.includes(cid.code)) {
    return {
      ipfsRoots: [cid],
      terminalElement: basicEntry('object', cid, bytes)
    }
  }

  // may be an unknown codec
  return {
    ipfsRoots: [cid],
    terminalElement: basicEntry('raw', cid, bytes)
  }
}

function basicEntry (type: 'raw' | 'object', cid: CID, bytes: Uint8Array): UnixFSEntry {
  return {
    name: cid.toString(),
    path: cid.toString(),
    depth: 0,
    type,
    node: bytes,
    cid,
    size: BigInt(bytes.byteLength),
    content: async function * () {
      yield bytes
    }
  }
}
