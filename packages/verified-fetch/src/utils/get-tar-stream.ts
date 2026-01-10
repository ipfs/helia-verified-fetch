import { NotUnixFSError } from '@helia/unixfs/errors'
import { InvalidParametersError } from '@libp2p/interface'
import { exporter, recursive, walkPath } from 'ipfs-unixfs-exporter'
import last from 'it-last'
import map from 'it-map'
import { pipe } from 'it-pipe'
import { pack } from 'it-tar'
import type { AbortOptions } from '@libp2p/interface'
import type { Blockstore } from 'interface-blockstore'
import type { UnixFSEntry } from 'ipfs-unixfs-exporter'
import type { TarEntryHeader, TarImportCandidate } from 'it-tar'

const EXPORTABLE = ['file', 'raw', 'directory']

function toHeader (file: UnixFSEntry, path: string): Partial<TarEntryHeader> & { name: string } {
  let mode: number | undefined
  let mtime: Date | undefined
  let size = 0n

  if (file.type === 'file' || file.type === 'raw' || file.type === 'identity') {
    size = file.size
  }

  if (file.type === 'file' || file.type === 'directory') {
    mode = file.unixfs.mode
    mtime = file.unixfs.mtime != null ? new Date(Number(file.unixfs.mtime.secs * 1000n)) : undefined
  }

  return {
    name: path,
    mode,
    mtime,
    size: Number(size),
    type: file.type === 'directory' ? 'directory' : 'file'
  }
}

function toTarImportCandidate (entry: UnixFSEntry, path: string): TarImportCandidate {
  if (!EXPORTABLE.includes(entry.type)) {
    throw new NotUnixFSError(`${entry.type} is not a UnixFS node`)
  }

  const candidate: TarImportCandidate = {
    header: toHeader(entry, path)
  }

  if (entry.type === 'file' || entry.type === 'raw') {
    candidate.body = entry.content()
  }

  return candidate
}

export async function * tarStream (ipfsPath: string, blockstore: Blockstore, options?: AbortOptions): AsyncGenerator<Uint8Array> {
  const entry = await last(walkPath(ipfsPath, blockstore, options))

  if (entry == null) {
    throw new InvalidParametersError(`Could not walk path "${ipfsPath}"`)
  }

  const file = await exporter(entry.cid, blockstore, options)

  if (file.type === 'file' || file.type === 'raw') {
    yield * pipe(
      [toTarImportCandidate(file, entry.path)],
      pack()
    )

    return
  }

  if (file.type === 'directory') {
    yield * pipe(
      recursive(file.cid, blockstore, options),
      (source) => map(source, async (entry) => {
        const file = await exporter(entry.cid, blockstore, options)
        return toTarImportCandidate(file, entry.path)
      }),
      pack()
    )

    return
  }

  throw new NotUnixFSError('Not a UnixFS node')
}
