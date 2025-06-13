import * as ipldDagCbor from '@ipld/dag-cbor'
import { CID } from 'multiformats/cid'
import { isLink } from 'multiformats/link'
import { getETag } from '../utils/get-e-tag.js'
import { getIpfsRoots } from '../utils/response-headers.js'
import { isObjectNode } from '../utils/walk-path.js'
import { BasePlugin } from './plugin-base.js'
import type { PluginContext, VerifiedFetchPluginFactory } from './types.js'
import type { ObjectNode } from 'ipfs-unixfs-exporter'

/**
 * Handles `dag-cbor` content where the Accept: `text/html` header is present.
 */
export class DagCborHtmlPreviewPlugin extends BasePlugin {
  readonly id = 'dag-cbor-plugin-html-preview'
  readonly codes = [ipldDagCbor.code]

  canHandle ({ cid, accept, pathDetails }: PluginContext): boolean {
    this.log('checking if we can handle %c with accept %s', cid, accept)
    if (pathDetails == null) {
      return false
    }
    if (!isObjectNode(pathDetails.terminalElement)) {
      return false
    }
    if (cid.code !== ipldDagCbor.code) {
      return false
    }

    if (accept == null || !accept.includes('text/html')) {
      return false
    }

    return isObjectNode(pathDetails.terminalElement)
  }

  async handle (context: PluginContext & Required<Pick<PluginContext, 'byteRangeContext' | 'pathDetails'>> & { pathDetails: { terminalElement: ObjectNode } }): Promise<Response> {
    const { cid, path, pathDetails: { terminalElement, ipfsRoots } } = context
    this.log.trace('generating html preview for %c/%s', cid, path)

    const block = terminalElement.node
    let obj: Record<string, any>
    try {
      obj = ipldDagCbor.decode(block)
    } catch (err) {
      return new Response(`<pre>Failed to decode DAG-CBOR: ${String(err)}</pre>`, {
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    const html = this.getHtml({ path, obj, cid })

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'X-Ipfs-Roots': getIpfsRoots(ipfsRoots),
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=2678400',
        Etag: getETag({ cid, reqFormat: context.reqFormat, contentPrefix: 'DirIndex-' })
      }
    })
  }

  getHtml ({ path, obj, cid }: { path: string, obj: Record<string, any>, cid: CID }): string {
    const style = `
      :root {
        --sans-serif: "Plex", system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif;
        --monospace: Consolas, monaco, monospace;
        --navy: #073a53;
        --teal: #6bc4ce;
        --turquoise: #47AFB4;
        --steel-gray: #3f5667;
        --dark-white: #d9dbe2;
        --light-white: #edf0f4;
        --near-white: #f7f8fa;
        --radius: 4px;
      }
      body {
        color: #34373f;
        font-family: var(--sans-serif);
        line-height: 1.43;
        margin: 0;
        word-break: break-all;
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
        -webkit-tap-highlight-color: transparent;
      }
      main {
        border: 1px solid var(--dark-white);
        border-radius: var(--radius);
        overflow: hidden;
        margin: 1em;
        font-size: .875em;
      }
      main section header {
        background-color: var(--near-white);
      }
      main header, main section:not(:last-child) {
        border-bottom: 1px solid var(--dark-white);
      }
      main header {
        padding-top: .7em;
        padding-bottom: .7em;
        background-color: var(--light-white);
      }
      main header, main .container {
        padding-left: 1em;
        padding-right: 1em;
      }
      section {
        display: block;
      }
      .grid.dag {
        grid-template-columns: max-content 1fr;
      }
      .grid {
        display: grid;
        overflow-x: auto;
      }
      .grid.dag > div {
        background: white;
      }
      .grid.dag > div:nth-of-type(2n+1) {
        padding-left: 1em;
      }
      .grid.dag > div:nth-child(4n), .grid.dag > div:nth-child(4n+3) {
        background-color: var(--near-white);
      }
      .grid.dag .grid {
        padding: 0;
      }
      /* change coloring of nested grid
      .grid.dag .grid.dag > div:nth-child(4n), .grid.dag .grid.dag > div:nth-child(4n+3) {
        background-color: white;
      }
      .grid.dag .grid.dag div:nth-child(4n+1), .grid.dag .grid.dag div:nth-child(4n+2) {
        background-color: var(--near-white);
      } */
      .grid.dag > div:nth-last-child(-n+2) {
        border-bottom: 0;
      }
      .grid .grid {
        overflow-x: visible;
      }
      .grid > div {
        padding: .7em;
        border-bottom: 1px solid var(--dark-white);
      }
      .nowrap {
        white-space: nowrap;
      }
      pre, code {
        font-family: var(--monospace);
      }
      strong {
        font-weight: bolder;
      }
      a:active, a:visited {
        color: #00b0e9;
      }
      .ipfs-hash {
        color: #7f8491;
        font-family: var(--monospace);
      }
      a {
        color: #117eb3;
        text-decoration: none;
      }
      header { margin-bottom: 2em; }
      .ipfs-logo { width: 32px; height: 32px; background: url('data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlo89/56ZQ/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACUjDu1lo89/6mhTP+zrVP/nplD/5+aRK8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHNiIS6Wjz3/ubFY/761W/+vp1D/urRZ/8vDZf/GvmH/nplD/1BNIm8AAAAAAAAAAAAAAAAAAAAAAAAAAJaPPf+knEj/vrVb/761W/++tVv/r6dQ/7q0Wf/Lw2X/y8Nl/8vDZf+tpk7/nplD/wAAAAAAAAAAAAAAAJaPPf+2rVX/vrVb/761W/++tVv/vrVb/6+nUP+6tFn/y8Nl/8vDZf/Lw2X/y8Nl/8G6Xv+emUP/AAAAAAAAAACWjz3/vrVb/761W/++tVv/vrVb/761W/+vp1D/urRZ/8vDZf/Lw2X/y8Nl/8vDZf/Lw2X/nplD/wAAAAAAAAAAlo89/761W/++tVv/vrVb/761W/++tVv/r6dQ/7q0Wf/Lw2X/y8Nl/8vDZf/Lw2X/y8Nl/56ZQ/8AAAAAAAAAAJaPPf++tVv/vrVb/761W/++tVv/vbRa/5aPPf+emUP/y8Nl/8vDZf/Lw2X/y8Nl/8vDZf+emUP/AAAAAAAAAACWjz3/vrVb/761W/++tVv/vrVb/5qTQP+inkb/op5G/6KdRv/Lw2X/y8Nl/8vDZf/Lw2X/nplD/wAAAAAAAAAAlo89/761W/++tVv/sqlS/56ZQ//LxWb/0Mlp/9DJaf/Kw2X/oJtE/7+3XP/Lw2X/y8Nl/56ZQ/8AAAAAAAAAAJaPPf+9tFr/mJE+/7GsUv/Rymr/0cpq/9HKav/Rymr/0cpq/9HKav+xrFL/nplD/8vDZf+emUP/AAAAAAAAAACWjz3/op5G/9HKav/Rymr/0cpq/9HKav/Rymr/0cpq/9HKav/Rymr/0cpq/9HKav+inkb/nplD/wAAAAAAAAAAAAAAAKKeRv+3slb/0cpq/9HKav/Rymr/0cpq/9HKav/Rymr/0cpq/9HKav+1sFX/op5G/wAAAAAAAAAAAAAAAAAAAAAAAAAAop5GUKKeRv/Nxmf/0cpq/9HKav/Rymr/0cpq/83GZ/+inkb/op5GSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAop5G16KeRv/LxWb/y8Vm/6KeRv+inkaPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAop5G/6KeRtcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/n8AAPgfAADwDwAAwAMAAIABAACAAQAAgAEAAIABAACAAQAAgAEAAIABAACAAQAAwAMAAPAPAAD4HwAA/n8AAA==') no-repeat center/contain; display: inline-block; }
    `

    return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="description" content="Content-addressed dag-cbor document hosted on IPFS.">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="shortcut icon" href="data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlo89/56ZQ/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACUjDu1lo89/6mhTP+zrVP/nplD/5+aRK8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHNiIS6Wjz3/ubFY/761W/+vp1D/urRZ/8vDZf/GvmH/nplD/1BNIm8AAAAAAAAAAAAAAAAAAAAAAAAAAJaPPf+knEj/vrVb/761W/++tVv/r6dQ/7q0Wf/Lw2X/y8Nl/8vDZf+tpk7/nplD/wAAAAAAAAAAAAAAAJaPPf+2rVX/vrVb/761W/++tVv/vrVb/6+nUP+6tFn/y8Nl/8vDZf/Lw2X/y8Nl/8G6Xv+emUP/AAAAAAAAAACWjz3/vrVb/761W/++tVv/vrVb/761W/+vp1D/urRZ/8vDZf/Lw2X/y8Nl/8vDZf/Lw2X/nplD/wAAAAAAAAAAlo89/761W/++tVv/vrVb/761W/++tVv/r6dQ/7q0Wf/Lw2X/y8Nl/8vDZf/Lw2X/y8Nl/56ZQ/8AAAAAAAAAAJaPPf++tVv/vrVb/761W/++tVv/vbRa/5aPPf+emUP/y8Nl/8vDZf/Lw2X/y8Nl/8vDZf+emUP/AAAAAAAAAACWjz3/vrVb/761W/++tVv/vrVb/5qTQP+inkb/op5G/6KdRv/Lw2X/y8Nl/8vDZf/Lw2X/nplD/wAAAAAAAAAAlo89/761W/++tVv/sqlS/56ZQ//LxWb/0Mlp/9DJaf/Kw2X/oJtE/7+3XP/Lw2X/y8Nl/56ZQ/8AAAAAAAAAAJaPPf+9tFr/mJE+/7GsUv/Rymr/0cpq/9HKav/Rymr/0cpq/9HKav+xrFL/nplD/8vDZf+emUP/AAAAAAAAAACWjz3/op5G/9HKav/Rymr/0cpq/9HKav/Rymr/0cpq/9HKav/Rymr/0cpq/9HKav+inkb/nplD/wAAAAAAAAAAAAAAAKKeRv+3slb/0cpq/9HKav/Rymr/0cpq/9HKav/Rymr/0cpq/9HKav+1sFX/op5G/wAAAAAAAAAAAAAAAAAAAAAAAAAAop5GUKKeRv/Nxmf/0cpq/9HKav/Rymr/0cpq/83GZ/+inkb/op5GSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAop5G16KeRv/LxWb/y8Vm/6KeRv+inkaPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAop5G/6KeRtcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/n8AAPgfAADwDwAAwAMAAIABAACAAQAAgAEAAIABAACAAQAAgAEAAIABAACAAQAAwAMAAPAPAAD4HwAA/n8AAA==">
      <title>${cid.toString()} DAG-CBOR Preview</title>
      <style>${style}</style>
    </head>
    <body>
      <main>
        <header>
          <div><strong>CID: </strong> <code class="nowrap">${cid}</code></div>
          <div><strong>Codec: </strong> ${this.valueHTML('dag-cbor (0x71)', null)}</div>
        </header>
        <section class="container">
          <p>You can download this block as:</p>
          <ul>
            <li><a href="?format=raw&download=true&filename=${cid.toString()}.bin" rel="nofollow" download="${cid.toString()}.bin">Raw Block</a> (no conversion)</li>
            <li><a href="?format=dag-json&download=true&filename=${cid.toString()}.json" rel="nofollow" download="${cid.toString()}">Valid DAG-JSON</a> (specs at <a href="https://ipld.io/specs/codecs/dag-json/spec/" target="_blank" rel="noopener noreferrer">IPLD</a> and <a href="https://www.iana.org/assignments/media-types/application/vnd.ipld.dag-json" target="_blank" rel="noopener noreferrer">IANA</a>)</li>
            <li><a href="?format=dag-cbor&download=true&filename=${cid.toString()}.dag-cbor" rel="nofollow" download="${cid.toString()}.dag-cbor">Valid DAG-CBOR</a> (specs at <a href="https://ipld.io/specs/codecs/dag-cbor/spec/" target="_blank" rel="noopener noreferrer">IPLD</a> and <a href="https://www.iana.org/assignments/media-types/application/vnd.ipld.dag-cbor" target="_blank" rel="noopener noreferrer">IANA</a>)</li>
          </ul>
        </section>
        <section>
          <header><strong>DAG-CBOR Preview</strong></header>
          <div class="grid dag">
            ${this.renderRows(obj, path)}
          </div>
        </section>
      </main>
    </body>
  </html>`
  }

  valueHTML (value: any, link: string | null): string {
    let valueString: string
    const isALinkObject = isLink(value)
    if (!isALinkObject && typeof value !== 'string') {
      valueString = JSON.stringify(value)
    } else {
      // it can be a string or a link object.. call .toString() on it
      valueString = value.toString()
    }
    const valueCodeBlock = `<code class="nowrap">${valueString}</code>`
    if (isALinkObject && link != null) {
      return `<a class="ipfs-hash" href="/${link}">${valueCodeBlock}</a>`
    }

    return valueCodeBlock
  }

  private isPrimitive (value: unknown): boolean {
    return value === null ||
      value === undefined ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint' ||
      typeof value === 'symbol'
  }

  private renderValue (key: string, value: any, currentPath: string): string {
    let rows = ''
    value.forEach((item: any, idx: number) => {
      const itemPath = currentPath ? `${currentPath}/${key}/${idx}` : `${key}/${idx}`
      rows += `<div>${this.valueHTML(idx, null)}</div>`
      if (this.isPrimitive(item)) {
        rows += `<div>${this.valueHTML(item, itemPath)}</div>`
      } else {
        rows += '<div class="grid dag">'
        rows += this.renderRows(item, itemPath)
        rows += '</div>'
      }
    })
    return rows
  }

  renderRows (obj: Record<string, any>, currentPath: string = ''): string {
    let rows = ''
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        rows += `<div>${key}</div>`
        rows += '<div class="grid dag">'
        rows += this.renderValue(key, value, currentPath)
        rows += '</div>'
      } else {
        const valuePath = currentPath ? `${currentPath}/${key}` : key
        rows += `<div>${key}</div><div>${this.valueHTML(value, valuePath)}</div>`
      }
    }
    return rows
  }
}

export const dagCborHtmlPreviewPluginFactory: VerifiedFetchPluginFactory = (opts) => new DagCborHtmlPreviewPlugin(opts)
