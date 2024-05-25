import { prefixLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { CID } from 'multiformats/cid'
import Sinon from 'sinon'
import { getRedirectUrl, getSpecCompliantPath } from '../../src/utils/handle-redirects.js'

const logger = prefixLogger('test:handle-redirects')

describe('handle-redirects', () => {
  const sandbox = Sinon.createSandbox()
  const cid = CID.parse('bafkqabtimvwgy3yk')

  let fetchStub: Sinon.SinonStub

  describe('getSpecCompliantPath', () => {
    // the below are all assuming the above identity CID is a unixFS directory CID
    it('should handle ipfs:// urls', () => {
      expect(getSpecCompliantPath(`ipfs://${cid}`)).to.equal(`ipfs://${cid}/`)
      expect(getSpecCompliantPath(`ipfs://${cid}/file.txt`)).to.equal(`ipfs://${cid}/file.txt`)
    })

    it('should handle ipns:// urls', () => {
      expect(getSpecCompliantPath(`ipns://${cid}`)).to.equal(`ipns://${cid}/`)
      expect(getSpecCompliantPath(`ipns://${cid}/file.txt`)).to.equal(`ipns://${cid}/file.txt`)
    })

    it('should handle http:// path urls', () => {
      expect(getSpecCompliantPath(`http://ipfs.io/ipfs/${cid}`)).to.equal(`http://ipfs.io/ipfs/${cid}/`)
      expect(getSpecCompliantPath(`http://ipfs.io/ipfs/${cid}/file.txt`)).to.equal(`http://ipfs.io/ipfs/${cid}/file.txt`)
    })

    it('should handle http:// subdomain urls', () => {
      expect(getSpecCompliantPath(`http://ipfs.io/ipfs/${cid}`)).to.equal(`http://ipfs.io/ipfs/${cid}/`)
      expect(getSpecCompliantPath(`http://ipfs.io/ipfs/${cid}/file.txt`)).to.equal(`http://ipfs.io/ipfs/${cid}/file.txt`)
    })
  })

  describe('getRedirectUrl', () => {
    beforeEach(() => {
      fetchStub = sandbox.stub(globalThis, 'fetch')
    })

    afterEach(() => {
      sandbox.restore()
    })
    it('returns path gateway url if HEAD fetch fails', async () => {
      const resource = 'http://ipfs.io/ipfs/bafkqabtimvwgy3yk'
      const options = { headers: new Headers({ host: 'ipfs.io' }) }
      fetchStub.returns(Promise.resolve(new Response(null, { status: 404 })))

      const url = await getRedirectUrl({ resource, options, logger, cid, fetch: fetchStub })
      expect(fetchStub.calledOnce).to.be.true()
      expect(url).to.equal('http://ipfs.io/ipfs/bafkqabtimvwgy3yk')
    })
    it('returns subdomain gateway url if HEAD fetch is successful', async () => {
      const resource = 'http://ipfs.io/ipfs/bafkqabtimvwgy3yk'
      const options = { headers: new Headers({ host: 'ipfs.io' }) }
      fetchStub.returns(Promise.resolve(new Response(null, { status: 200 })))

      const url = await getRedirectUrl({ resource, options, logger, cid, fetch: fetchStub })
      expect(fetchStub.calledOnce).to.be.true()
      expect(url).to.equal('http://bafkqabtimvwgy3yk.ipfs.ipfs.io/')
    })

    it('returns the given subdomain gateway url given a subdomain gateway url', async () => {
      const resource = 'http://bafkqabtimvwgy3yk.ipfs.inbrowser.dev'
      const options = { headers: new Headers({ host: 'bafkqabtimvwgy3yk.ipfs.inbrowser.dev' }) }
      fetchStub.returns(Promise.resolve(new Response(null, { status: 200 })))

      const url = await getRedirectUrl({ resource, options, logger, cid, fetch: fetchStub })
      expect(fetchStub.calledOnce).to.be.false()
      expect(url).to.equal('http://bafkqabtimvwgy3yk.ipfs.inbrowser.dev')
    })
  })
})
