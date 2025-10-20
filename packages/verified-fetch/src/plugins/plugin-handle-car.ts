import { BlockExporter, car, CIDPath, SubgraphExporter, UnixFSExporter } from '@helia/car'
import { code as dagPbCode } from '@ipld/dag-pb'
import { createScalableCuckooFilter } from '@libp2p/utils'
import toBrowserReadableStream from 'it-to-browser-readablestream'
import { getOffsetAndLength } from '../utils/get-offset-and-length.ts'
import { okRangeResponse } from '../utils/responses.js'
import { BasePlugin } from './plugin-base.js'
import type { PluginContext } from './types.js'
import type { ExportCarOptions, UnixFSExporterOptions } from '@helia/car'

function getFilename ({ cid, ipfsPath, query }: Pick<PluginContext, 'query' | 'cid' | 'ipfsPath'>): string {
  if (query.filename != null) {
    return query.filename
  }

  // convert context.ipfsPath to a filename. replace all / with _, replace prefix protocol with empty string
  const filename = ipfsPath
    .replace(/\/ipfs\//, '')
    .replace(/\/ipns\//, '')
    .replace(/\//g, '_')

  return `${filename}.car`
}

// https://specs.ipfs.tech/http-gateways/trustless-gateway/#dag-scope-request-query-parameter
type DagScope = 'all' | 'entity' | 'block'
function getDagScope ({ query }: Pick<PluginContext, 'query'>): DagScope | null {
  const dagScope = query['dag-scope']

  if (dagScope === 'all' || dagScope === 'entity' || dagScope === 'block') {
    return dagScope
  }

  // entity-bytes implies entity scope
  if (query['entity-bytes']) {
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

  canHandle (context: PluginContext): boolean {
    this.log('checking if we can handle %c with accept %s', context.cid, context.accept)

    if (context.byteRangeContext == null) {
      return false
    }

    if (context.pathDetails == null) {
      return false
    }

    return context.accept?.mimeType.startsWith('application/vnd.ipld.car') === true || context.query.format === 'car' // application/vnd.ipld.car
  }

  async handle (context: PluginContext & Required<Pick<PluginContext, 'byteRangeContext'>>): Promise<Response> {
    const { options, pathDetails, cid, query, accept } = context

    const order = accept?.options.order === 'dfs' ? 'dfs' : 'unk'
    const duplicates = accept?.options.dups !== 'n'

    if (pathDetails == null) {
      throw new Error('attempted to handle request for car with no path details')
    }

    const { getBlockstore, helia } = this.pluginOptions
    context.reqFormat = 'car'
    context.query.download = true
    context.query.filename = getFilename(context)
    const blockstore = getBlockstore(cid, context.resource, options?.session ?? true, options)

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

    if (pathDetails.ipfsRoots.length > 1) {
      carExportOptions.traversal = new CIDPath(pathDetails.ipfsRoots)
    }

    const dagScope = getDagScope(context)
    const target = pathDetails.terminalElement.cid ?? cid

    if (dagScope === 'block') {
      carExportOptions.exporter = new BlockExporter()
    } else if (dagScope === 'entity') {
      // if its unixFS, we need to enumerate a directory, or get all/some blocks
      // for the entity, otherwise, use blockExporter
      if (target.code === dagPbCode) {
        const options: UnixFSExporterOptions = {
          listingOnly: true
        }

        const slice = getOffsetAndLength(pathDetails.terminalElement, query['entity-bytes']?.toString())
        options.offset = slice.offset
        options.length = slice.length

        carExportOptions.exporter = new UnixFSExporter(options)
      } else {
        carExportOptions.exporter = new BlockExporter()
      }
    } else {
      carExportOptions.exporter = new SubgraphExporter()
    }

    context.byteRangeContext.setBody(toBrowserReadableStream(c.export(target, carExportOptions)))

    const response = okRangeResponse(context.resource, context.byteRangeContext.getBody('application/vnd.ipld.car; version=1'), {
      byteRangeContext: context.byteRangeContext,
      log: this.log
    })
    response.headers.set('content-type', context.byteRangeContext.getContentType() ?? `application/vnd.ipld.car; version=1; order=${order}; dups=${duplicates ? 'y' : 'n'}`)

    return response
  }
}
