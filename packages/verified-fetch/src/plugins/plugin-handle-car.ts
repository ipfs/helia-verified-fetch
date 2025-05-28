import { BlockExporter, car, CIDPath, SubgraphExporter, UnixFSExporter } from '@helia/car'
import { code as dagPbCode } from '@ipld/dag-pb'
import toBrowserReadableStream from 'it-to-browser-readablestream'
import { okRangeResponse } from '../utils/responses.js'
import { BasePlugin } from './plugin-base.js'
import type { PluginContext } from './types.js'
import type { ExportCarOptions } from '@helia/car'

function getFilename ({ cid, ipfsPath, query }: Pick<PluginContext, 'query' | 'cid' | 'ipfsPath'>): string {
  if (query.filename != null) {
    return query.filename
  }

  // convert context.ipfsPath to a filename. replace all / with _, replace prefix protocol with empty string
  const filename = ipfsPath.replace(/\/ipfs\//, '').replace(/\/ipns\//, '').replace(/\//g, '_')

  return `${filename}.car`
}

// https://specs.ipfs.tech/http-gateways/trustless-gateway/#dag-scope-request-query-parameter
type DagScope = 'all' | 'entity' | 'block'
function getDagScope ({ query }: Pick<PluginContext, 'query'>): DagScope | null {
  const dagScope = query['dag-scope']
  if (dagScope === 'all' || dagScope === 'entity' || dagScope === 'block') {
    return dagScope
  }
  return null
}

/**
 * Accepts a `CID` and returns a `Response` with a body stream that is a CAR
 * of the `DAG` referenced by the `CID`.
 */
export class CarPlugin extends BasePlugin {
  readonly id = 'car-plugin'

  canHandle (context: PluginContext): boolean {
    this.log('checking if we can handle %c with accept %s', context.cid, context.accept)
    // if (context.pathDetails == null) {
    //   return false
    // }
    if (context.byteRangeContext == null) {
      return false
    }
    if (context.pathDetails == null) {
      return false
    }

    return context.accept?.startsWith('application/vnd.ipld.car') === true || context.query.format === 'car' // application/vnd.ipld.car
  }

  async handle (context: PluginContext & Required<Pick<PluginContext, 'byteRangeContext'>>): Promise<Response> {
    const { options, pathDetails, cid } = context
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
      traversal: new CIDPath(pathDetails.ipfsRoots)
    }
    const dagScope = getDagScope(context)
    if (dagScope === 'block') {
      carExportOptions.exporter = new BlockExporter()
    } else if (dagScope === 'all') {
      carExportOptions.exporter = new SubgraphExporter()
    } else if (dagScope === 'entity') {
      // if its unixFS, we need to enumerate a directory, or get all blocks for the entity, otherwise, use blockExporter
      if (pathDetails.terminalElement.cid.code === dagPbCode) {
        carExportOptions.exporter = new UnixFSExporter()
      } else {
        carExportOptions.exporter = new BlockExporter()
      }
    }
    const stream = toBrowserReadableStream(c.stream(pathDetails?.terminalElement.cid ?? cid, carExportOptions))
    context.byteRangeContext.setBody(stream)

    const response = okRangeResponse(context.resource, context.byteRangeContext.getBody(), { byteRangeContext: context.byteRangeContext, log: this.log })
    response.headers.set('content-type', 'application/vnd.ipld.car; version=1')

    return response
  }
}
