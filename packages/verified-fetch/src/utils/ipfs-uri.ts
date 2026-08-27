/**
 * Build the value of the `Ipfs-Uri` response header defined by IPIP-0548: a
 * single canonical `ipfs://` or `ipns://` URI equivalent to the requested
 * content path, before path traversal. The value never contains a query or a
 * fragment.
 */
export function toIpfsUri (url: URL): string | undefined {
  return `${url.protocol === 'dnslink:' ? 'ipns:' : url.protocol}//${url.hostname}${url.pathname}`
}
