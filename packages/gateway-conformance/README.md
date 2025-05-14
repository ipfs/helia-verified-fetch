<p align="center">
  <a href="https://github.com/ipfs/helia" title="Helia">
    <img src="https://raw.githubusercontent.com/ipfs/helia/main/assets/helia.png" alt="Helia logo" width="300" />
  </a>
</p>

# @helia/verified-fetch-gateway-conformance

[![ipfs.tech](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](https://ipfs.tech)
[![Discuss](https://img.shields.io/discourse/https/discuss.ipfs.tech/posts.svg?style=flat-square)](https://discuss.ipfs.tech)
[![codecov](https://img.shields.io/codecov/c/github/ipfs/helia-verified-fetch.svg?style=flat-square)](https://codecov.io/gh/ipfs/helia-verified-fetch)
[![CI](https://img.shields.io/github/actions/workflow/status/ipfs/helia-verified-fetch/js-test-and-release.yml?branch=main\&style=flat-square)](https://github.com/ipfs/helia-verified-fetch/actions/workflows/js-test-and-release.yml?query=branch%3Amain)

> Gateway conformance tests for @helia/verified-fetch

# About

<!--

!IMPORTANT!

Everything in this README between "# About" and "# Install" is automatically
generated and will be overwritten the next time the doc generator is run.

To make changes to this section, please update the @packageDocumentation section
of src/index.js or src/index.ts

To experiment with formatting, please run "npm run docs" from the root of this
repo and examine the changes made.

-->

Runs Gateway Conformance tests against @helia/verified-fetch using Kubo as a
backing trustless-gateway.

## Example - Testing a new @helia/verified-fetch release

```console
$ npm i @helia/verified-fetch-gateway-conformance
$ VERIFIED_FETCH=@helia/verified-fetch@1.x.x-6f8c15b verified-fetch-gateway-conformance
```

## Example - Testing with a different Kubo version

```console
$ npm i @helia/verified-fetch-gateway-conformance
$ KUBO_BINARY=/path/to/kubo verified-fetch-gateway-conformance
```

## Example - using a different gateway-conformance image

```console
$ GWC_IMAGE=ghcr.io/ipfs/gateway-conformance:v0.5.1 verified-fetch-gateway-conformance
```

## Example - Debugging a test run

```console
$ DEBUG="-mocha*,*,*:trace" npm run test # very verbose output
$ DEBUG="conformance-tests*,conformance-tests*:trace" npm run test # only gateway-conformance test output
```

## Example - querying the gateway-conformance server directly

```console
$ npm run build
$ node dist/src/demo-server.js # in terminal 1
$ curl -v GET http://localhost:3442/ipfs/bafkqabtimvwgy3yk/  # in terminal 2
```

## Troubleshooting

### Missing file in gateway-conformance-fixtures folder

If you see the following error:

> ENOENT: no such file or directory, open '\[...]/helia-verified-fetch/packages/gateway-conformance/dist/src/...

This likely means the docker container is not executing properly for some
reason. You can try running the following command to see if there are any
errors: `DEBUG="-mocha*,*,*:trace" npm run test`

# Install

```console
$ npm i @helia/verified-fetch-gateway-conformance
```

> [Gateway Conformance](https://github.com/ipfs/gateway-conformance) tests for @helia/verified-fetch

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/ipfs/helia-verified-fetch/blob/main/packages/gateway-conformance/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/ipfs/helia-verified-fetch/blob/main/packages/gateway-conformance/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribute

Contributions welcome! Please check out [the issues](https://github.com/ipfs/helia-verified-fetch/issues).

Also see our [contributing document](https://github.com/ipfs/community/blob/master/CONTRIBUTING_JS.md) for more information on how we work, and about contributing in general.

Please be aware that all interactions related to this repo are subject to the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/CONTRIBUTING.md)
