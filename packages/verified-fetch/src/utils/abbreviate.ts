import { HTTP, HTTPS, QUIC, QUIC_V1, TCP, WebRTC, WebRTCDirect, WebSockets, WebSocketsSecure, WebTransport } from '@multiformats/multiaddr-matcher'
import type { Multiaddr } from '@multiformats/multiaddr'

const ABBREVIATIONS: Record<string, string> = {
  // operations
  'ipfs.resolve': 'i',
  'dnsLink.resolve': 'd',
  'ipns.resolve': 'n',
  'found-provider': 'p',
  'find-providers': 'f',
  connect: 'c',
  block: 'b',

  // routers
  'http-gateway-router': 'h',
  'libp2p-router': 'l',

  // block brokers
  'trustless-gateway': 't',
  bitswap: 'b'
}

export function abbreviate (str: string): string {
  return ABBREVIATIONS[str] ?? str
}

export function abbreviateAddress (ma: Multiaddr): string {
  if (TCP.exactMatch(ma)) {
    return 't'
  }

  if (HTTP.exactMatch(ma) || HTTPS.exactMatch(ma)) {
    return 'h'
  }

  if (WebSockets.exactMatch(ma) || WebSocketsSecure.exactMatch(ma)) {
    return 'w'
  }

  if (WebRTC.exactMatch(ma)) {
    return 'r'
  }

  if (WebRTCDirect.exactMatch(ma)) {
    return 'd'
  }

  if (QUIC.exactMatch(ma) || QUIC_V1.exactMatch(ma)) {
    return 'q'
  }

  if (WebTransport.exactMatch(ma)) {
    return 'b'
  }

  return 'u'
}
