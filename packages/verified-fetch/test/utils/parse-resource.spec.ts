import { expect } from 'aegir/chai'
import { stringToIpfsUrl } from '../../src/utils/parse-resource.ts'

const schemes = {
  Path: '/{scheme}/{key}',
  URL: '{scheme}://{key}'
}

const types = [
  ['ipfs', 'ipfs'],
  ['ipns', 'ipns'],
  ['dnslink', 'ipns']
]

const keys: Record<string, Record<string, string>> = {
  ipfs: {
    CID: 'bafkreicysg23kiwv34eg2d7qweipxwosdo2py4ldv42nbauguluen5v6am',
    'case sensitive CID': 'QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn'
  },
  ipns: {
    PeerID: '12D3KooWAsKeVQRVqBi2uzfVub7L6b7oByD1dGmorN644bEx6TyT',
    'PeerID CID': 'bafzaajaiaejcad45sqaz4vc7ftbzbyw5clcjhifslsklqzkqn4hcghvuqmim7qok'
  },
  dnslink: {
    domain: 'example.org'
  }
}

const testCases: Record<string, { ref: string, verify: any }> = {
  'and path': {
    ref: '/foo/bar',
    verify: {
      path: ['foo', 'bar']
    }
  },
  'and path with trailing slash': {
    ref: '/foo/bar/',
    verify: {
      path: ['foo', 'bar']
    }
  },
  'and path and query': {
    ref: '/foo/bar?baz=qux',
    verify: {
      path: ['foo', 'bar'],
      query: {
        baz: 'qux'
      }
    }
  },
  'and path with trailing slash and query': {
    ref: '/foo/bar/?baz=qux',
    verify: {
      path: ['foo', 'bar'],
      query: {
        baz: 'qux'
      }
    }
  },
  'and path and fragment': {
    ref: '/foo/bar#garply',
    verify: {
      path: ['foo', 'bar'],
      fragment: 'garply'
    }
  },
  'and path with trailing slash and fragment': {
    ref: '/foo/bar/#garply',
    verify: {
      path: ['foo', 'bar'],
      fragment: 'garply'
    }
  },
  'and path and query and fragment': {
    ref: '/foo/bar?baz=qux#garply',
    verify: {
      path: ['foo', 'bar'],
      query: {
        baz: 'qux'
      },
      fragment: 'garply'
    }
  },
  'and path with trailing slash and query and fragment': {
    ref: '/foo/bar/?baz=qux#garply',
    verify: {
      path: ['foo', 'bar'],
      query: {
        baz: 'qux'
      },
      fragment: 'garply'
    }
  },
  'and query': {
    ref: '?baz=qux',
    verify: {
      query: {
        baz: 'qux'
      }
    }
  },
  'and trailing slash and query': {
    ref: '/?baz=qux',
    verify: {
      query: {
        baz: 'qux'
      }
    }
  },
  'and query and fragment': {
    ref: '?baz=qux#garply',
    verify: {
      query: {
        baz: 'qux'
      },
      fragment: 'garply'
    }
  },
  'and trailing slash and query and fragment': {
    ref: '/?baz=qux#garply',
    verify: {
      query: {
        baz: 'qux'
      },
      fragment: 'garply'
    }
  },
  'and fragment': {
    ref: '#garply',
    verify: {
      fragment: 'garply'
    }
  },
  'and trailing slash and fragment': {
    ref: '/#garply',
    verify: {
      fragment: 'garply'
    }
  }
}

describe('parse-url-string', () => {
  for (const [type, protocol] of types) {
    for (const [scheme, uri] of Object.entries(schemes)) {
      for (const [key, value] of Object.entries(keys[type])) {
        for (const [name, test] of Object.entries(testCases)) {
          it(`should parse ${type.toUpperCase()} ${scheme} with ${key} ${name}`, () => {
            expect(stringToIpfsUrl(`${uri.replace('{scheme}', protocol).replace('{key}', value)}${test.ref}`))
              .to.deep.equal(new URL(`${type}://${value}${test.ref}`))
          })
        }
      }
    }
  }
})
