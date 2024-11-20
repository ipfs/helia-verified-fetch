import { createNode, type KuboNode } from 'ipfsd-ctl'
import { path as kuboPath } from 'kubo'
import { create } from 'kubo-rpc-client'

export async function createKuboNode (repoPath = undefined): Promise<KuboNode> {
  return createNode({
    type: 'kubo',
    rpc: create,
    bin: kuboPath(),
    test: true,
    repo: repoPath,
    init: {
      config: {
        Addresses: {
          Swarm: [
            '/ip4/0.0.0.0/tcp/4001',
            '/ip4/0.0.0.0/tcp/4002/ws',
            '/ip4/0.0.0.0/udp/4001/webrtc-direct',
            '/ip4/0.0.0.0/udp/4001/quic-v1/webtransport',
            '/ip6/::/udp/4001/webrtc-direct',
            '/ip6/::/udp/4001/quic-v1/webtransport'
          ],
          Gateway: '/ip4/127.0.0.1/tcp/8180'
        },
        Gateway: {
          NoFetch: true,
          ExposeRoutingAPI: true,
          HTTPHeaders: {
            'Access-Control-Allow-Origin': ['*'],
            'Access-Control-Allow-Methods': ['GET', 'POST', 'PUT', 'OPTIONS']
          }
        }
      }
    },
    args: ['--enable-pubsub-experiment', '--enable-namesys-pubsub']
  })
}
