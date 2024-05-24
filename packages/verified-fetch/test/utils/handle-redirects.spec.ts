import { prefixLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { CID } from 'multiformats/cid'
import Sinon from 'sinon'
import { getRedirectResponse } from '../../src/utils/handle-redirects.js'

const logger = prefixLogger('test:handle-redirects')
describe('handle-redirects', () => {
  describe('getRedirectResponse', () => {
    const sandbox = Sinon.createSandbox()
    const cid = CID.parse('bafkqabtimvwgy3yk')

    let fetchStub: Sinon.SinonStub

    beforeEach(() => {
      fetchStub = sandbox.stub(globalThis, 'fetch')
    })

    afterEach(() => {
      sandbox.restore()
    })

    const nullResponses = [
      { resource: cid, options: {}, logger, cid, testTitle: 'should return null if resource is not a string' },
      { resource: 'http://ipfs.io/ipfs/bafkqabtimvwgy3yk', options: undefined, logger, cid, testTitle: 'should return null if options is undefined' },
      { resource: 'ipfs://', options: {}, logger, cid, testTitle: 'should return null for ipfs:// protocol urls' },
      { resource: 'ipns://', options: {}, logger, cid, testTitle: 'should return null for ipns:// protocol urls' }
    ]

    nullResponses.forEach(({ resource, options, logger, cid, testTitle }) => {
      it(testTitle, async () => {
        const response = await getRedirectResponse({ resource, options, logger, cid })
        expect(response).to.be.null()
      })
    })

    it('should attempt to get the current host from the headers', async () => {
      const resource = 'http://ipfs.io/ipfs/bafkqabtimvwgy3yk'
      const options = { headers: new Headers({ 'x-forwarded-host': 'localhost:3931' }) }
      fetchStub.returns(Promise.resolve(new Response(null, { status: 200 })))

      const response = await getRedirectResponse({ resource, options, logger, cid, fetch: fetchStub })
      expect(fetchStub.calledOnce).to.be.true()
      expect(response).to.not.be.null()
      expect(response).to.have.property('status', 301)
      const location = response?.headers.get('location')
      expect(location).to.equal('http://bafkqabtimvwgy3yk.ipfs.localhost:3931/')
    })

    it('should return redirect response to requested host with trailing slash when HEAD fetch fails', async () => {
      const resource = 'http://ipfs.io/ipfs/bafkqabtimvwgy3yk'
      const options = { headers: new Headers({ 'x-forwarded-host': 'localhost:3931' }) }
      fetchStub.returns(Promise.reject(new Response(null, { status: 404 })))

      const response = await getRedirectResponse({ resource, options, logger, cid, fetch: fetchStub })
      expect(fetchStub.calledOnce).to.be.true()
      expect(response).to.not.be.null()
      expect(response).to.have.property('status', 301)
      const location = response?.headers.get('location')
      // note that the URL returned in location header has trailing slash.
      expect(location).to.equal('http://ipfs.io/ipfs/bafkqabtimvwgy3yk/')
    })

    it('should not return redirect response to x-forwarded-host if HEAD fetch fails', async () => {
      const resource = 'http://ipfs.io/ipfs/bafkqabtimvwgy3yk/file.txt'
      const options = { headers: new Headers({ 'x-forwarded-host': 'localhost:3931' }) }
      fetchStub.returns(Promise.reject(new Response(null, { status: 404 })))

      const response = await getRedirectResponse({ resource, options, logger, cid, fetch: fetchStub })
      expect(fetchStub.calledOnce).to.be.true()
      expect(response).to.be.null()
    })

    it('should not return redirect response to x-forwarded-host when HEAD fetch fails and trailing slash already exists', async () => {
      const resource = 'http://ipfs.io/ipfs/bafkqabtimvwgy3yk/'
      const options = { headers: new Headers({ 'x-forwarded-host': 'localhost:3931' }) }
      fetchStub.returns(Promise.reject(new Response(null, { status: 404 })))

      const response = await getRedirectResponse({ resource, options, logger, cid, fetch: fetchStub })
      expect(fetchStub.calledOnce).to.be.true()
      expect(response).to.be.null()
    })
  })
})
