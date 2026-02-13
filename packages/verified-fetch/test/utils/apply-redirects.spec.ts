import { expect } from 'aegir/chai'
import { applyRedirects } from '../../src/utils/apply-redirect.ts'

describe('apply-redirects', () => {
  it('should apply simple redirect', () => {
    const request = new URL('ipfs://bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise/foo.html')
    const _redirects = '/foo.html /bar.html 302'

    const result = applyRedirects(request, _redirects)

    expect(result).to.deep.equal(new URL('ipfs://bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise/bar.html'))
  })

  it('should preserve query params', () => {
    const request = new URL('ipfs://bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise/foo.html?foo=bar')
    const _redirects = '/foo.html /bar.html 302'

    const result = applyRedirects(request, _redirects)

    expect(result).to.deep.equal(new URL('ipfs://bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise/bar.html?foo=bar'))
  })

  it('should add static query params from redirects file', () => {
    const request = new URL('ipfs://bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise/foo.html')
    const _redirects = '/foo.html /bar.html?foo=bar 302'

    const result = applyRedirects(request, _redirects)

    expect(result).to.deep.equal(new URL('ipfs://bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise/bar.html?foo=bar'))
  })

  it('should override static query params from redirects file with user query params', () => {
    const request = new URL('ipfs://bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise/foo.html?foo=bar')
    const _redirects = '/foo.html /bar.html?foo=baz&qux=quux 302'

    const result = applyRedirects(request, _redirects)

    expect(result).to.deep.equal(new URL('ipfs://bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise/bar.html?foo=bar&qux=quux'))
  })

  it('should support placeholders', () => {
    const request = new URL('ipfs://bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise/blog/2026/01/12/my-super-fun-blog-post')
    const _redirects = '/blog/:year/:month/:day/:title /new-blog/:year/:month/:day/:title 302'

    const result = applyRedirects(request, _redirects)

    expect(result).to.deep.equal(new URL('ipfs://bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise/new-blog/2026/01/12/my-super-fun-blog-post'))
  })

  it('should support placeholders in query strings', () => {
    const request = new URL('ipfs://bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise/blog/2026/01/12/my-super-fun-blog-post')
    const _redirects = '/blog/:year/:month/:day/:title /new-blog?year=:year&month=:month&day=:day&title=:title 302'

    const result = applyRedirects(request, _redirects)

    expect(result).to.deep.equal(new URL('ipfs://bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise/new-blog?year=2026&month=01&day=12&title=my-super-fun-blog-post'))
  })

  it('should support splat', () => {
    const request = new URL('ipfs://bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise/blog/2026/01/12/my-super-fun-blog-post')
    const _redirects = '/blog/* /new-blog/:splat 302'

    const result = applyRedirects(request, _redirects)

    expect(result).to.deep.equal(new URL('ipfs://bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise/new-blog/2026/01/12/my-super-fun-blog-post'))
  })

  it('should error if the same placeholder is used more than once in from', async () => {
    const request = new URL('ipfs://bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise/blog/2026/01/12/my-super-fun-blog-post')
    const _redirects = '/blog/:year/:year/:year/:year /new-blog/:splat 302'

    const result = applyRedirects(request, _redirects)

    if (!(result instanceof Response)) {
      throw new Error('Expected response')
    }

    expect(result).to.have.property('status', 500)

    const err = await result.json()
    expect(err).to.have.property('name', 'DuplicatePlaceholderError')
  })

  it('should allow the same placeholder to be used multiple times in to', () => {
    const request = new URL('ipfs://bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise/blog/2026/01/12/my-super-fun-blog-post')
    const _redirects = '/blog/:year/:month/:day/:title /new-blog?year=:year&month=:year&day=:year&title=:year 302'

    const result = applyRedirects(request, _redirects)

    expect(result).to.deep.equal(new URL('ipfs://bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise/new-blog?year=2026&month=2026&day=2026&title=2026'))
  })

  it('should only treat a trailing /* as a splat', () => {
    const request = new URL('ipfs://bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise/blog/*/2026/01/12/my-super-fun-blog-post')
    const _redirects = '/blog/*/2026/* /new-blog/2026/:splat 302'

    const result = applyRedirects(request, _redirects)
    expect(result).to.deep.equal(new URL('ipfs://bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise/new-blog/2026/01/12/my-super-fun-blog-post'))
  })

  it('should error if the status code is not allowed', async () => {
    const request = new URL('ipfs://bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise/blog/2026/01/12/my-super-fun-blog-post')
    const _redirects = '/blog/* /new-blog/:splat 123'

    const result = applyRedirects(request, _redirects)

    if (!(result instanceof Response)) {
      throw new Error('Expected response')
    }

    expect(result).to.have.property('status', 500)

    const err = await result.json()
    expect(err).to.have.property('name', 'InvalidRedirectStatusCodeError')
  })

  it('should return a response with the location set for manual redirects', () => {
    const request = new URL('ipfs://bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise/blog/2026/01/12/my-super-fun-blog-post')
    const _redirects = '/blog/* /new-blog/:splat 302'

    const result = applyRedirects(request, _redirects, {
      redirect: 'manual'
    })

    if (!(result instanceof Response)) {
      throw new Error('Expected response')
    }

    expect(result).to.have.property('status', 302)
    expect(result.headers.get('location')).to.equal('ipfs://bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise/new-blog/2026/01/12/my-super-fun-blog-post')
  })

  it('should default to 301 for redirects', () => {
    const request = new URL('ipfs://bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise/blog/2026/01/12/my-super-fun-blog-post')
    const _redirects = '/blog/* /new-blog/:splat'

    const result = applyRedirects(request, _redirects, {
      redirect: 'manual'
    })

    if (!(result instanceof Response)) {
      throw new Error('Expected response')
    }

    expect(result).to.have.property('status', 301)
    expect(result.headers.get('location')).to.equal('ipfs://bafybeichqiz32cw5c3vdpvh2xtfgl42veqbsr6sw2g6c7ffz6atvh2vise/new-blog/2026/01/12/my-super-fun-blog-post')
  })
})
