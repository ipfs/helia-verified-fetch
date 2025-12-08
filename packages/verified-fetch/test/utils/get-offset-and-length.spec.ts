import { expect } from 'aegir/chai'
import { entityBytesToOffsetAndLength, rangeToOffsetAndLength } from '../../src/utils/get-offset-and-length.ts'

describe('get-offset-and-length (entity bytes)', () => {
  it('should default to whole file', () => {
    expect(entityBytesToOffsetAndLength(100n)).to.deep.equal({
      offset: 0,
      length: 100
    })
  })

  it('should select whole file for wildcard', () => {
    expect(entityBytesToOffsetAndLength(100n, '0:*')).to.deep.equal({
      offset: 0,
      length: 100
    })
  })

  it('should return slice from inside file', () => {
    expect(entityBytesToOffsetAndLength(100n, '0:100')).to.deep.equal({
      offset: 0,
      length: 100
    })
  })

  it('should count "from" backwards', () => {
    expect(entityBytesToOffsetAndLength(100n, '-10:*')).to.deep.equal({
      offset: 90,
      length: 10
    })
  })

  it('should count "to" backwards', () => {
    expect(entityBytesToOffsetAndLength(100n, '10:-10')).to.deep.equal({
      offset: 10,
      length: 80
    })
  })

  it('should count "from" and "to" backwards', () => {
    expect(entityBytesToOffsetAndLength(100n, '-10:-5')).to.deep.equal({
      offset: 90,
      length: 5
    })
  })

  it('should wrap negative "from" to start of file', () => {
    expect(entityBytesToOffsetAndLength(100n, '-200:*')).to.deep.equal({
      offset: 0,
      length: 100
    })
  })
})

describe('get-offset-and-length (range)', () => {
  it('should default to whole file', () => {
    expect(rangeToOffsetAndLength(100n)).to.deep.equal({
      offset: 0,
      length: 100
    })
  })

  it('should select whole file for wildcard', () => {
    expect(rangeToOffsetAndLength(100n, 0)).to.deep.equal({
      offset: 0,
      length: 100
    })
  })

  it('should return slice from inside file', () => {
    expect(rangeToOffsetAndLength(100n, 0, 99)).to.deep.equal({
      offset: 0,
      length: 100
    })
  })

  it('should treat end as inclusive', () => {
    expect(rangeToOffsetAndLength(10n, 0, 5)).to.deep.equal({
      offset: 0,
      length: 6
    })
  })

  it('should return file suffix', () => {
    expect(rangeToOffsetAndLength(10n, undefined, -5)).to.deep.equal({
      offset: 5,
      length: 5
    })
  })
})
