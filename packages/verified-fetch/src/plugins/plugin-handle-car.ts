import { BlockExporter, car, CIDPath, depthFirstWalker, naturalOrderWalker, SubgraphExporter, UnixFSExporter } from '@helia/car'
import { code as dagPbCode } from '@ipld/dag-pb'
import { createScalableCuckooFilter } from '@libp2p/utils'
import { exporter } from 'ipfs-unixfs-exporter'
import toBrowserReadableStream from 'it-to-browser-readablestream'
import { CONTENT_TYPE_CAR, MEDIA_TYPE_CAR } from '../utils/content-types.ts'
import { getContentDispositionFilename } from '../utils/get-content-disposition-filename.ts'
import { entityBytesToOffsetAndLength } from '../utils/get-offset-and-length.ts'
import { badRequestResponse, notAcceptableResponse, okResponse } from '../utils/responses.js'
import { BasePlugin } from './plugin-base.js'
import type { PluginContext } from '../index.js'
import type { ExportCarOptions, UnixFSExporterOptions } from '@helia/car'

function getFilename (ipfsPath: string): string {
  // convert context.ipfsPath to a filename. replace all / with _, replace prefix protocol with empty string
  const filename = ipfsPath
    .replace(/\/ipfs\//, '')
    .replace(/\/ipns\//, '')
    .replace(/\/+$/g, '')
    .replace(/\//g, '_')

  return `${filename}.car`
}

/**
 * @see https://specs.ipfs.tech/http-gateways/trustless-gateway/#dag-scope-request-query-parameter
 */
type DagScope = 'all' | 'entity' | 'block'

function getDagScope ({ url }: PluginContext): DagScope | null {
  const dagScope = url.searchParams.get('dag-scope')

  if (dagScope === 'all' || dagScope === 'entity' || dagScope === 'block') {
    return dagScope
  }

  // entity-bytes implies entity scope
  if (url.searchParams.has('entity-bytes')) {
    return 'entity'
  }

  return 'all'
}

/**
 * Accepts a `CID` and returns a `Response` with a body stream that is a CAR
 * of the `DAG` referenced by the `CID`.
 */
export class CarPlugin extends BasePlugin {
  readonly id = 'car-plugin'

  canHandle ({ accept }: PluginContext): boolean {
    return accept.some(header => header.contentType.mediaType === MEDIA_TYPE_CAR)
  }

  async handle (context: PluginContext): Promise<Response> {
    const { options, url, accept, resource, blockstore, range, ipfsRoots, terminalElement, requestedMimeTypes } = context

    if (range != null) {
      return badRequestResponse(resource, new Error('Range requests are not supported for CAR files'))
    }

    const acceptCar = accept.filter(header => header.contentType.mediaType === MEDIA_TYPE_CAR).pop()

    // we have already asserted that the CAR media type is present so this
    // branch should never be hit
    if (acceptCar == null) {
      return badRequestResponse(resource, new Error('Could not find CAR media type in accept header'))
    }

    const order = acceptCar.options.order === 'dfs' ? 'dfs' : 'unk'
    const duplicates = acceptCar.options.dups !== 'n'

    // TODO: `@ipld/car` only supports CARv1
    if (acceptCar.options.version === '2' || url.searchParams.get('car-version') === '2') {
      return notAcceptableResponse(resource, requestedMimeTypes, [
        CONTENT_TYPE_CAR
      ])
    }

    const helia = this.pluginOptions.helia

    const c = car({
      blockstore,
      getCodec: helia.getCodec,
      logger: helia.logger
    })

    const carExportOptions: ExportCarOptions = {
      ...options,
      includeTraversalBlocks: true
    }

    if (!duplicates) {
      carExportOptions.blockFilter = createScalableCuckooFilter(1024)
    }

    if (ipfsRoots.length > 1) {
      carExportOptions.traversal = new CIDPath(ipfsRoots)
    }

    const dagScope = getDagScope(context)
    const target = terminalElement.cid

    if (dagScope === 'block') {
      carExportOptions.exporter = new BlockExporter()
    } else if (dagScope === 'entity') {
      // if its unixFS, we need to enumerate a directory, or get all/some blocks
      // for the entity, otherwise, use blockExporter
      if (target.code === dagPbCode) {
        const options: UnixFSExporterOptions = {
          listingOnly: true
        }

        const entry = await exporter(terminalElement.cid, blockstore, context.options)

        if (entry.type === 'file') {
          const slice = entityBytesToOffsetAndLength(entry.size, url.searchParams.get('entity-bytes'))
          options.offset = slice.offset
          options.length = slice.length
        }

        carExportOptions.exporter = new UnixFSExporter(options)
      } else {
        carExportOptions.exporter = new BlockExporter()
      }
    } else {
      carExportOptions.exporter = new SubgraphExporter({
        walker: order === 'dfs' ? depthFirstWalker() : naturalOrderWalker()
      })
    }

    const stream = toBrowserReadableStream(c.export(target, carExportOptions))

    return okResponse(resource, stream, {
      headers: {
        'content-type': `${MEDIA_TYPE_CAR}; version=1; order=${order}; dups=${duplicates ? 'y' : 'n'}`,
        'content-disposition': `attachment; ${
          getContentDispositionFilename(url.searchParams.get('filename') ?? getFilename(`/ipfs/${url.hostname}${url.pathname}`))
        }`,
        'x-content-type-options': 'nosniff',
        'accept-ranges': 'none'
      }
    })
  }
}
