import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { getOffsetAndLength } from '../../src/utils/get-offset-and-length.ts'
import type { UnixFSEntry } from 'ipfs-unixfs-exporter'

describe('get-offset-and-length', () => {
  it('should default to whole file', () => {
    const entry = stubInterface<UnixFSEntry>({
      size: 100n
    })

    expect(getOffsetAndLength(entry)).to.deep.equal({
      offset: 0,
      length: Infinity
    })
  })

  it('should select whole file for wildcard', () => {
    const entry = stubInterface<UnixFSEntry>({
      size: 100n
    })

    expect(getOffsetAndLength(entry, '0:*')).to.deep.equal({
      offset: 0,
      length: Infinity
    })
  })

  it('should return slice from inside file', () => {
    const entry = stubInterface<UnixFSEntry>({
      size: 100n
    })

    expect(getOffsetAndLength(entry, '0:100')).to.deep.equal({
      offset: 0,
      length: 100
    })
  })

  it('should count "from" backwards', () => {
    const entry = stubInterface<UnixFSEntry>({
      size: 100n
    })

    expect(getOffsetAndLength(entry, '-10:10')).to.deep.equal({
      offset: 90,
      length: 20
    })
  })

  it('should count "to" backwards', () => {
    const entry = stubInterface<UnixFSEntry>({
      size: 100n
    })

    expect(getOffsetAndLength(entry, '10:-10')).to.deep.equal({
      offset: 10,
      length: 80
    })
  })

  it('should count "from" and "to" backwards', () => {
    const entry = stubInterface<UnixFSEntry>({
      size: 100n
    })

    expect(getOffsetAndLength(entry, '-10:-5')).to.deep.equal({
      offset: 90,
      length: 5
    })
  })

  it('should wrap negative "from" to start of file', () => {
    const entry = stubInterface<UnixFSEntry>({
      size: 100n
    })

    expect(getOffsetAndLength(entry, '-200:*')).to.deep.equal({
      offset: 0,
      length: Infinity
    })
  })
})
