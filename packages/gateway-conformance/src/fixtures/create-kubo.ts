import { createController, type Controller } from 'ipfsd-ctl'
import { path as kuboPath } from 'kubo'
import * as kuboRpcClient from 'kubo-rpc-client'

export async function createKuboNode (listenPort?: number): Promise<Controller> {
  return createController({
    kuboRpcModule: kuboRpcClient,
    ipfsBin: kuboPath(),
    test: true,
    ipfsOptions: {
      config: {
        repo: process.env.KUBO_REPO ?? '',
        Addresses: {
          Swarm: [
            '/ip4/0.0.0.0/tcp/0',
            '/ip4/0.0.0.0/tcp/0/ws'
          ],
          Gateway: `/ip4/127.0.0.1/tcp/${listenPort ?? 0}`
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
    }
  })
}
