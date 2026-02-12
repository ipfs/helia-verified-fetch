import { unixfs } from '@helia/unixfs'
import * as dagCbor from '@ipld/dag-cbor'
import * as dagJson from '@ipld/dag-json'
import * as dagPb from '@ipld/dag-pb'
import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import toBuffer from 'it-to-buffer'
import { CID } from 'multiformats'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { MEDIA_TYPE_DAG_CBOR, MEDIA_TYPE_JSON, MEDIA_TYPE_RAW, MEDIA_TYPE_DAG_PB, MEDIA_TYPE_DAG_JSON, MEDIA_TYPE_CBOR } from '../src/index.ts'
import { VerifiedFetch } from '../src/verified-fetch.ts'
import { createHelia } from './fixtures/create-offline-helia.js'
import type { Helia } from 'helia'

const FILE_DATA = uint8ArrayFromString('hello world\n')

interface UnixFSFixture {
  contentType?: string
  verify (res: Response, cid: CID, helia: Helia, cids: Record<string, CID>): Promise<void>
}

interface UnixFSFixtures {
  accept?: string
  fixtures: Record<string, UnixFSFixture>
}

const fixtures: Record<string, UnixFSFixtures> = {
  default: {
    fixtures: {
      raw: {
        contentType: 'text/plain; charset=utf-8',
        async verify (res) {
          expect(new Uint8Array(await res.arrayBuffer())).to.equalBytes(FILE_DATA)
        }
      },
      file: {
        contentType: 'text/plain; charset=utf-8',
        async verify (res) {
          expect(new Uint8Array(await res.arrayBuffer())).to.equalBytes(FILE_DATA)
        }
      },
      directory: {
        contentType: MEDIA_TYPE_DAG_PB,
        async verify (res, cid, helia) {
          expect(dagPb.decode(new Uint8Array(await res.arrayBuffer())))
            .to.deep.equal(dagPb.decode(await toBuffer(helia.blockstore.get(cid))))
        }
      },
      shard: {
        contentType: MEDIA_TYPE_DAG_PB,
        async verify (res, cid, helia) {
          expect(dagPb.decode(new Uint8Array(await res.arrayBuffer())))
            .to.deep.equal(dagPb.decode(await toBuffer(helia.blockstore.get(cid))))
        }
      }
    }
  },
  JSON: {
    accept: MEDIA_TYPE_JSON,
    fixtures: {
      raw: {
        async verify (res, cid, helia) {
          expect(new Uint8Array(await res.arrayBuffer()))
            .to.deep.equal(
              await toBuffer(helia.blockstore.get(cid))
            )
        }
      },
      file: {
        async verify (res, cid, helia) {
          expect(new Uint8Array(await res.arrayBuffer()))
            .to.deep.equal(
              await toBuffer(helia.blockstore.get(cid))
            )
        }
      },
      directory: {
        async verify (res, cid, helia) {
          expect(new Uint8Array(await res.arrayBuffer()))
            .to.equalBytes(
              await toBuffer(helia.blockstore.get(cid))
            )
        }
      },
      shard: {
        async verify (res, cid, helia) {
          expect(new Uint8Array(await res.arrayBuffer()))
            .to.equalBytes(
              await toBuffer(helia.blockstore.get(cid))
            )
        }
      }
    }
  },
  'DAG-JSON': {
    accept: MEDIA_TYPE_DAG_JSON,
    fixtures: {
      raw: {
        async verify (res, cid, helia) {
          expect(dagJson.decode(new Uint8Array(await res.arrayBuffer())))
            .to.deep.equal(
              dagJson.decode(
                dagJson.encode(await toBuffer(helia.blockstore.get(cid)))
              )
            )
        }
      },
      file: {
        async verify (res, cid, helia) {
          expect(dagJson.decode(new Uint8Array(await res.arrayBuffer())))
            .to.deep.equal(
              dagPb.decode(await toBuffer(helia.blockstore.get(cid)))
            )
        }
      },
      directory: {
        async verify (res, cid, helia) {
          expect(dagJson.decode(new Uint8Array(await res.arrayBuffer())))
            .to.deep.equal(
              dagPb.decode(await toBuffer(helia.blockstore.get(cid)))
            )
        }
      },
      shard: {
        async verify (res, cid, helia) {
          expect(dagJson.decode(new Uint8Array(await res.arrayBuffer())))
            .to.deep.equal(
              dagPb.decode(await toBuffer(helia.blockstore.get(cid)))
            )
        }
      }
    }
  },
  CBOR: {
    accept: MEDIA_TYPE_CBOR,
    fixtures: {
      raw: {
        async verify (res, cid, helia) {
          expect(new Uint8Array(await res.arrayBuffer()))
            .to.deep.equal(
              await toBuffer(helia.blockstore.get(cid))
            )
        }
      },
      file: {
        async verify (res, cid, helia) {
          expect(new Uint8Array(await res.arrayBuffer()))
            .to.deep.equal(
              await toBuffer(helia.blockstore.get(cid))
            )
        }
      },
      directory: {
        async verify (res, cid, helia) {
          expect(new Uint8Array(await res.arrayBuffer()))
            .to.deep.equal(
              await toBuffer(helia.blockstore.get(cid))
            )
        }
      },
      shard: {
        async verify (res, cid, helia) {
          expect(new Uint8Array(await res.arrayBuffer()))
            .to.deep.equal(
              await toBuffer(helia.blockstore.get(cid))
            )
        }
      }
    }
  },
  'DAG-CBOR': {
    accept: MEDIA_TYPE_DAG_CBOR,
    fixtures: {
      raw: {
        async verify (res, cid, helia) {
          expect(dagCbor.decode(new Uint8Array(await res.arrayBuffer())))
            .to.deep.equal(
              await toBuffer(helia.blockstore.get(cid))
            )
        }
      },
      file: {
        async verify (res, cid, helia) {
          expect(dagCbor.decode(new Uint8Array(await res.arrayBuffer())))
            .to.deep.equal(
              dagPb.decode(await toBuffer(helia.blockstore.get(cid)))
            )
        }
      },
      directory: {
        async verify (res, cid, helia) {
          expect(dagCbor.decode(new Uint8Array(await res.arrayBuffer())))
            .to.deep.equal(
              dagPb.decode(await toBuffer(helia.blockstore.get(cid)))
            )
        }
      },
      shard: {
        async verify (res, cid, helia) {
          expect(dagCbor.decode(new Uint8Array(await res.arrayBuffer())))
            .to.deep.equal(
              dagPb.decode(await toBuffer(helia.blockstore.get(cid)))
            )
        }
      }
    }
  },
  raw: {
    accept: MEDIA_TYPE_RAW,
    fixtures: {
      raw: {
        async verify (res, cid, helia) {
          expect(new Uint8Array(await res.arrayBuffer()))
            .to.deep.equal(
              await toBuffer(helia.blockstore.get(cid))
            )
        }
      },
      file: {
        async verify (res, cid, helia) {
          expect(new Uint8Array(await res.arrayBuffer()))
            .to.deep.equal(
              await toBuffer(helia.blockstore.get(cid))
            )
        }
      },
      directory: {
        async verify (res, cid, helia) {
          expect(new Uint8Array(await res.arrayBuffer()))
            .to.deep.equal(
              await toBuffer(helia.blockstore.get(cid))
            )
        }
      },
      shard: {
        async verify (res, cid, helia) {
          expect(new Uint8Array(await res.arrayBuffer()))
            .to.deep.equal(
              await toBuffer(helia.blockstore.get(cid))
            )
        }
      }
    }
  }
}

describe('dag-pb', () => {
  let helia: Helia
  let verifiedFetch: VerifiedFetch
  let cids: Record<string, CID>

  beforeEach(async () => {
    helia = await createHelia()
    verifiedFetch = new VerifiedFetch(helia)

    const fs = unixfs(helia)

    const rawCID = await fs.addBytes(FILE_DATA)
    const fileCID = await fs.addBytes(FILE_DATA, {
      rawLeaves: false,
      reduceSingleLeafToSelf: false
    })

    const emptyDirCid = await fs.addDirectory()
    const directoryCID = await fs.cp(fileCID, emptyDirCid, 'hello.txt')

    const shardCID = await fs.cp(fileCID, emptyDirCid, 'hello.txt', {
      shardSplitThresholdBytes: 0
    })

    cids = {
      raw: rawCID,
      file: fileCID,
      directory: directoryCID,
      shard: shardCID
    }
  })

  afterEach(async () => {
    await stop(helia, verifiedFetch)
  })

  it('should 502 on non-unixfs data loaded as dag-pb', async () => {
    const cid = CID.createV1(dagPb.code, cids.raw.multihash)
    const res = await verifiedFetch.fetch(`/ipfs/${cid}`)

    expect(res).to.have.property('status', 502)
  })

  for (const [type, types] of Object.entries(fixtures)) {
    for (const [name, fixture] of Object.entries(types.fixtures)) {
      // eslint-disable-next-line no-loop-func
      it(`should download dag-pb ${name} as ${type}`, async () => {
        const cid = cids[name]
        const headers = new Headers()

        if (types.accept != null) {
          headers.set('accept', types.accept)
        }

        const res = await verifiedFetch.fetch(`/ipfs/${cid}`, {
          headers
        })
        expect(res.ok).to.be.true()
        expect(res.headers.get('content-type')).to.equal(fixture.contentType ?? types.accept)
        expect(res.headers.get('cache-control')).to.equal('public, max-age=29030400, immutable')

        await fixture.verify(res, cid, helia, cids)
      })
    }
  }
})
