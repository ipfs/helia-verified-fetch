import { expect } from 'aegir/chai'
import { selectOutputType } from '../../src/utils/select-output-type.js'
import { cids } from '../fixtures/cids.js'

describe('select-output-type', () => {
  it('should return undefined if no accept header passed', () => {
    const format = selectOutputType(cids.file)

    expect(format).to.be.undefined()
  })

  it('should override query format with Accept header if available', () => {
    const format = selectOutputType(cids.file, 'application/vnd.ipld.car')

    expect(format).to.deep.equal({
      mimeType: 'application/vnd.ipld.car',
      options: {
        q: '0'
      }
    })
  })

  it('should include options in query format override', () => {
    const format = selectOutputType(cids.file, 'application/vnd.ipld.car; dups=n; order=dfs')

    expect(format).to.deep.equal({
      mimeType: 'application/vnd.ipld.car',
      options: {
        q: '0',
        dups: 'n',
        order: 'dfs'
      }
    })
  })

  it('should match accept headers with equal weighting in definition order', () => {
    const format = selectOutputType(cids.file, 'application/x-tar, */*')

    expect(format).to.deep.equal({
      mimeType: 'application/x-tar',
      options: {
        q: '0'
      }
    })
  })

  it('should match accept headers in weighting order', () => {
    const format = selectOutputType(cids.file, 'application/x-tar;q=0.1, application/octet-stream;q=0.5, text/html')

    expect(format).to.deep.equal({
      mimeType: 'application/octet-stream',
      options: {
        q: '0.5'
      }
    })
  })

  it('should support partial type wildcard', () => {
    const format = selectOutputType(cids.file, '*/json')

    expect(format).to.deep.equal({
      mimeType: 'application/json',
      options: {
        q: '0'
      }
    })
  })

  it('should support partial subtype wildcard', () => {
    const format = selectOutputType(cids.file, 'application/*')

    expect(format).to.deep.equal({
      mimeType: 'application/octet-stream',
      options: {
        q: '0'
      }
    })
  })
})
