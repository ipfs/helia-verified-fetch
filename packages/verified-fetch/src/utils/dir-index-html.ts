import type { Logger } from '@libp2p/interface'
import type { UnixFSEntry } from 'ipfs-unixfs-exporter'

/**
 * Types taken from:
 *
 * * https://github.com/ipfs/boxo/blob/09b0013e1c3e09468009b02dfc9b2b9041199d5d/gateway/assets/assets.go#L92C1-L96C2
 * * https://github.com/ipfs/boxo/blob/09b0013e1c3e09468009b02dfc9b2b9041199d5d/gateway/assets/assets.go#L114C1-L135C2
 */

interface GlobalData {
  // Menu       []MenuItem
  gatewayURL: string
  dnsLink: boolean
  // root: UnixFSEntry
}

interface DirectoryTemplateData {
  globalData: GlobalData
  listing: DirectoryItem[]
  size: string
  path: string
  breadcrumbs: Breadcrumb[]
  backLink: string
  hash: string
  name: string
}

interface DirectoryItem {
  size: string
  name: string
  path: string
  hash: string
  shortHash: string
}

interface Breadcrumb {
  name: string
  path: string
}

export interface DirIndexHtmlOptions {
  gatewayURL: string
  dnsLink?: boolean
  log: Logger
}

// see https://github.com/ipfs/boxo/blob/09b0013e1c3e09468009b02dfc9b2b9041199d5d/gateway/assets/templates.go#L19C1-L25C2
function iconFromExt (name: string): string {
  // not implemented yet
  // TODO: optimize icons: https://github.com/ipfs-shipyard/ipfs-css/issues/71
  return 'ipfs-_blank'
}

function itemShortHashCell (item: DirectoryItem, dirData: DirectoryTemplateData): string {
  const href = dirData.globalData.dnsLink ? `https://inbrowser.dev/ipfs/${item.hash}` : `${dirData.globalData.gatewayURL}/ipfs/${item.hash}?filename=${item.name}`

  return `<a class="ipfs-hash" translate="no" href="${href}">${item.shortHash}</a>`
}

function dirListingTitle (dirData: DirectoryTemplateData): string {
  if (dirData.path != null) {
    const href = `${dirData.globalData.gatewayURL}/${dirData.path}`
    return `Index of <a href="${href}">${dirData.name}</a>`
  }
  return `Index of ${dirData.name} ${dirData.path}`
}

function getAllDirListingRows (dirData: DirectoryTemplateData): string {
  return dirData.listing.map((item) => `<div class="type-icon">
      <div class="${iconFromExt(item.name)}">&nbsp;</div>
    </div>
    <div>
      <a href="${item.path}">${item.name}</a>
    </div>
    <div class="nowrap">
      ${itemShortHashCell(item, dirData)}
    </div>
    <div class="nowrap" title="Cumulative size of IPFS DAG (data + metadata)">${item.size}</div>`).join(' ')
}

function getItemPath (item: UnixFSEntry): string {
  const itemPathParts = item.path.split('/')

  return itemPathParts.pop() ?? item.path
}

/**
 * if <= 11, return the hash as is
 * if > 11, return the first 4 and last 4 characters of the hash, separated by '...'
 *
 * e.g. QmabcccHnzA
 * e.g. Qmab...HnzA
 */
function getShortHash (hash: string): string {
  return hash.length <= 11 ? hash : `${hash.slice(0, 4)}...${hash.slice(-4)}`
}

/**
 * todo: https://github.com/ipfs/boxo/blob/09b0013e1c3e09468009b02dfc9b2b9041199d5d/gateway/handler_unixfs_dir.go#L200-L208
 *
 * @see https://github.com/ipfs/boxo/blob/09b0013e1c3e09468009b02dfc9b2b9041199d5d/gateway/assets/directory.html
 * @see https://github.com/ipfs/boxo/pull/298
 * @see https://github.com/ipfs/kubo/pull/8555
 */
export const dirIndexHtml = (dir: UnixFSEntry, items: UnixFSEntry[], { gatewayURL, dnsLink, log }: DirIndexHtmlOptions): string => {
  log('loading directory html for %s', dir.path)

  const dirData: DirectoryTemplateData = {
    globalData: {
      gatewayURL,
      dnsLink: dnsLink ?? false
    },
    listing: items.map((item) => {
      return {
        size: item.size.toString(),
        name: item.name,
        path: getItemPath(item),
        hash: item.cid.toString(),
        shortHash: getShortHash(item.cid.toString())
      } satisfies DirectoryItem
    }),
    name: dir.name,
    size: dir.size.toString(),
    path: dir.path,
    breadcrumbs: [],
    backLink: '',
    hash: dir.cid.toString()
  }

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="description" content="A directory of content-addressed files hosted on IPFS.">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="shortcut icon" href="data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlo89/56ZQ/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACUjDu1lo89/6mhTP+zrVP/nplD/5+aRK8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHNiIS6Wjz3/ubFY/761W/+vp1D/urRZ/8vDZf/GvmH/nplD/1BNIm8AAAAAAAAAAAAAAAAAAAAAAAAAAJaPPf+knEj/vrVb/761W/++tVv/r6dQ/7q0Wf/Lw2X/y8Nl/8vDZf+tpk7/nplD/wAAAAAAAAAAAAAAAJaPPf+2rVX/vrVb/761W/++tVv/vrVb/6+nUP+6tFn/y8Nl/8vDZf/Lw2X/y8Nl/8G6Xv+emUP/AAAAAAAAAACWjz3/vrVb/761W/++tVv/vrVb/761W/+vp1D/urRZ/8vDZf/Lw2X/y8Nl/8vDZf/Lw2X/nplD/wAAAAAAAAAAlo89/761W/++tVv/vrVb/761W/++tVv/r6dQ/7q0Wf/Lw2X/y8Nl/8vDZf/Lw2X/y8Nl/56ZQ/8AAAAAAAAAAJaPPf++tVv/vrVb/761W/++tVv/vbRa/5aPPf+emUP/y8Nl/8vDZf/Lw2X/y8Nl/8vDZf+emUP/AAAAAAAAAACWjz3/vrVb/761W/++tVv/vrVb/5qTQP+inkb/op5G/6KdRv/Lw2X/y8Nl/8vDZf/Lw2X/nplD/wAAAAAAAAAAlo89/761W/++tVv/sqlS/56ZQ//LxWb/0Mlp/9DJaf/Kw2X/oJtE/7+3XP/Lw2X/y8Nl/56ZQ/8AAAAAAAAAAJaPPf+9tFr/mJE+/7GsUv/Rymr/0cpq/9HKav/Rymr/0cpq/9HKav+xrFL/nplD/8vDZf+emUP/AAAAAAAAAACWjz3/op5G/9HKav/Rymr/0cpq/9HKav/Rymr/0cpq/9HKav/Rymr/0cpq/9HKav+inkb/nplD/wAAAAAAAAAAAAAAAKKeRv+3slb/0cpq/9HKav/Rymr/0cpq/9HKav/Rymr/0cpq/9HKav+1sFX/op5G/wAAAAAAAAAAAAAAAAAAAAAAAAAAop5GUKKeRv/Nxmf/0cpq/9HKav/Rymr/0cpq/83GZ/+inkb/op5GSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAop5G16KeRv/LxWb/y8Vm/6KeRv+inkaPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAop5G/6KeRtcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/n8AAPgfAADwDwAAwAMAAIABAACAAQAAgAEAAIABAACAAQAAgAEAAIABAACAAQAAwAMAAPAPAAD4HwAA/n8AAA==">
    <title>${dirData.path}</title>
    <style>${style}</style>
  </head>
  <body>
    <!--
    # Some JSON content for debugging:

    ## dirData
    ${JSON.stringify(dirData, null, 2)}
    -->
    <header id="header">
      <div class="ipfs-logo">&nbsp;</div>
      <!--
      <nav>
        <a href="https://ipfs.tech" target="_blank" rel="noopener noreferrer">About<span class="dn-mobile"> IPFS</span></a>
        <a href="https://docs.ipfs.tech/install/" target="_blank" rel="noopener noreferrer">Install<span class="dn-mobile"> IPFS</span></a>
      </nav>
      -->
    </header>
    <main id="main">
      <header class="flex flex-wrap">
        <div>
          <strong>${dirListingTitle(dirData)}</strong>
          ${dirData.hash == null
            ? ''
            : `<div class="ipfs-hash" translate="no">
                ${dirData.hash}
              </div>`
          }
        </div>
        ${dirData.size == null
          ? ''
          : `<div class="nowrap flex-shrink ml-auto">
              <strong title="Cumulative size of IPFS DAG (data + metadata)">&nbsp;${dirData.size}</strong>
            </div>`
        }
      </header>
      <div>
        <div class="grid dir">
          <!--{{ if .BackLink }}
            <div class="type-icon">
              <div class="ipfs-_blank">&nbsp;</div>
            </div>
            <div>
              <a href="{{.BackLink | urlEscape}}">..</a>
            </div>
            <div></div>
            <div></div>
          </tr>
          {{ end }}-->
          ${getAllDirListingRows(dirData)}
        </div>
      </div>
    </main>
  </body>
</html>`
}

const style = `

    .ipfs-_blank {
        background-image: url("data:image/svg+xml,%0A%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 72 100'%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='36' y1='1' x2='36' y2='99' gradientTransform='matrix(1 0 0 -1 0 100)'%3E%3Cstop offset='0' stop-color='%23c8d4db'/%3E%3Cstop offset='.139' stop-color='%23d8e1e6'/%3E%3Cstop offset='.359' stop-color='%23ebf0f3'/%3E%3Cstop offset='.617' stop-color='%23f9fafb'/%3E%3Cstop offset='1' stop-color='%23fff'/%3E%3C/linearGradient%3E%3Cpath d='M45 1l27 26.7V99H0V1h45z' fill='url(%23a)'/%3E%3Cpath d='M45 1l27 26.7V99H0V1h45z' fill-opacity='0' stroke='%237191a1' stroke-width='2'/%3E%3ClinearGradient id='b' gradientUnits='userSpaceOnUse' x1='45.068' y1='72.204' x2='58.568' y2='85.705' gradientTransform='matrix(1 0 0 -1 0 100)'%3E%3Cstop offset='0' stop-color='%23fff'/%3E%3Cstop offset='.35' stop-color='%23fafbfb'/%3E%3Cstop offset='.532' stop-color='%23edf1f4'/%3E%3Cstop offset='.675' stop-color='%23dde5e9'/%3E%3Cstop offset='.799' stop-color='%23c7d3da'/%3E%3Cstop offset='.908' stop-color='%23adbdc7'/%3E%3Cstop offset='1' stop-color='%2392a5b0'/%3E%3C/linearGradient%3E%3Cpath d='M45 1l27 26.7H45V1z' fill='url(%23b)'/%3E%3Cpath d='M45 1l27 26.7H45V1z' fill-opacity='0' stroke='%237191a1' stroke-width='2' stroke-linejoin='bevel'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-size: contain
    }

    :root {
        --sans-serif: "Plex",system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;
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

    pre, code {
        font-family: var(--monospace);
    }

    a {
        color: #117eb3;
        text-decoration: none;
    }

    a:hover {
        color: #00b0e9;
        text-decoration: underline;
    }

    a:active,a:visited {
        color: #00b0e9;
    }

    .flex {
        display: flex;
    }

    .flex-wrap {
        flex-flow: wrap;
    }

    .flex-shrink {
        flex-shrink: 1;
    }

    .ml-auto {
        margin-left: auto;
    }

    .nowrap {
        white-space: nowrap
    }

    .ipfs-hash {
        color: #7f8491;
        font-family: var(--monospace);
    }

    #header {
        align-items: center;
        background: var(--navy);
        border-bottom: 4px solid var(--teal);
        color: #fff;
        display: flex;
        font-weight: 500;
        justify-content: space-between;
        padding: 0 1em;
    }

    #header a {
        color: var(--teal);
    }

    #header a:active {
        color: #9ad4db;
    }

    #header a:hover {
        color: #fff;
    }

    #header .ipfs-logo {
        height: 2.25em;
        margin: .7em .7em .7em 0;
        width: 7.15em
    }

    #header nav {
        align-items: center;
        display: flex;
        margin: .65em 0;
    }

    #header nav a {
        margin: 0 .6em;
    }

    #header nav a:last-child {
        margin: 0 0 0 .6em;
    }

    #header nav svg {
        fill: var(--teal);
        height: 1.8em;
        margin-top: .125em;
    }

    #header nav svg:hover {
        fill: #fff;
    }

    main {
        border: 1px solid var(--dark-white);
        border-radius: var(--radius);
        overflow: hidden;
        margin: 1em;
        font-size: .875em;
    }

    main header,main .container {
        padding-left: 1em;
        padding-right: 1em;
    }

    main header {
        padding-top: .7em;
        padding-bottom: .7em;
        background-color: var(--light-white);
    }

    main header,main section:not(:last-child) {
        border-bottom: 1px solid var(--dark-white);
    }

    main section header {
        background-color: var(--near-white);
    }

    .grid {
        display: grid;
        overflow-x: auto;
    }

    .grid .grid {
        overflow-x: visible;
    }

    .grid > div {
        padding: .7em;
        border-bottom: 1px solid var(--dark-white);
    }

    .grid.dir {
        grid-template-columns: min-content 1fr min-content min-content;
    }

    .grid.dir > div:nth-of-type(4n+1) {
        padding-left: 1em;
    }

    .grid.dir > div:nth-of-type(4n+4) {
        padding-right: 1em;
    }

    .grid.dir > div:nth-last-child(-n+4) {
        border-bottom: 0;
    }

    .grid.dir > div:nth-of-type(8n+5),.grid.dir > div:nth-of-type(8n+6),.grid.dir > div:nth-of-type(8n+7),.grid.dir > div:nth-of-type(8n+8) {
        background-color: var(--near-white);
    }

    .grid.dag {
        grid-template-columns: max-content 1fr;
    }

    .grid.dag pre {
        margin: 0;
    }

    .grid.dag .grid {
        padding: 0;
    }

    .grid.dag > div:nth-last-child(-n+2) {
        border-bottom: 0;
    }

    .grid.dag > div {
        background: white
    }

    .grid.dag > div:nth-child(4n),.grid.dag > div:nth-child(4n+3) {
        background-color: var(--near-white);
    }

    section > .grid.dag > div:nth-of-type(2n+1) {
        padding-left: 1em;
    }

    .type-icon,.type-icon > * {
        width: 1.15em
    }

    .terminal {
        background: var(--steel-gray);
        color: white;
        padding: .7em;
        border-radius: var(--radius);
        word-wrap: break-word;
        white-space: break-spaces;
    }

    @media print {
        #header {
            display: none;
        }

        #main header,.ipfs-hash,body {
            color: #000;
        }

        #main,#main header {
            border-color: #000;
        }

        a,a:visited {
            color: #000;
            text-decoration: underline;
        }

        a[href]:after {
            content: " (" attr(href) ")"
        }
    }

    @media only screen and (max-width: 500px) {
        .dn-mobile {
            display: none;
        }
    }`
