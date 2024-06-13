import { prefixLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { CID } from 'multiformats/cid'
import { getRedirectUrl, getSpecCompliantPath } from '../../src/utils/handle-redirects.js'

const logger = prefixLogger('test:handle-redirects')

describe('handle-redirects', () => {
  const cid = CID.parse('bafkqabtimvwgy3yk')

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
    it('returns path gateway url if headers is empty', async () => {
      const resource = 'http://ipfs.io/ipfs/bafkqabtimvwgy3yk'
      const options = { headers: new Headers() }

      const url = await getRedirectUrl({ resource, options, logger, cid })
      expect(url).to.equal('http://ipfs.io/ipfs/bafkqabtimvwgy3yk')
    })

    it('returns subdomain gateway url if host is passed', async () => {
      const resource = 'http://ipfs.io/ipfs/bafkqabtimvwgy3yk'
      const options = { headers: new Headers({ host: 'ipfs.io' }) }

      const url = await getRedirectUrl({ resource, options, logger, cid })
      expect(url).to.equal('http://bafkqabtimvwgy3yk.ipfs.ipfs.io/')
    })

    it('returns subdomain gateway url if x-forwarded-host is passed', async () => {
      const resource = 'http://ipfs.io/ipfs/bafkqabtimvwgy3yk'
      const options = { headers: new Headers({ 'x-forwarded-host': 'dweb.link' }) }

      const url = await getRedirectUrl({ resource, options, logger, cid })
      expect(url).to.equal('http://bafkqabtimvwgy3yk.ipfs.dweb.link/')
    })

    it('returns https subdomain gateway url if proto & host are passed', async () => {
      const resource = 'http://ipfs.io/ipfs/bafkqabtimvwgy3yk'
      const options = { headers: new Headers({ host: 'ipfs.io', 'x-forwarded-proto': 'https' }) }

      const url = await getRedirectUrl({ resource, options, logger, cid })
      expect(url).to.equal('https://bafkqabtimvwgy3yk.ipfs.ipfs.io/')
    })

    it('returns the given subdomain gateway url given a subdomain gateway url', async () => {
      const resource = 'https://bafkqabtimvwgy3yk.ipfs.inbrowser.dev'
      const options = { headers: new Headers({ host: 'bafkqabtimvwgy3yk.ipfs.inbrowser.dev' }) }

      const url = await getRedirectUrl({ resource, options, logger, cid })
      expect(url).to.equal('https://bafkqabtimvwgy3yk.ipfs.inbrowser.dev')
    })
  })
})
