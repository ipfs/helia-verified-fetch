<p align="center">
  <a href="https://github.com/ipfs/helia" title="Helia">
    <img src="https://raw.githubusercontent.com/ipfs/helia/main/assets/helia.png" alt="Helia logo" width="300" />
  </a>
</p>

# @helia/verified-fetch-interop

[![ipfs.tech](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](https://ipfs.tech)
[![Discuss](https://img.shields.io/discourse/https/discuss.ipfs.tech/posts.svg?style=flat-square)](https://discuss.ipfs.tech)
[![codecov](https://img.shields.io/codecov/c/github/ipfs/helia-verified-fetch.svg?style=flat-square)](https://codecov.io/gh/ipfs/helia-verified-fetch)
[![CI](https://img.shields.io/github/actions/workflow/status/ipfs/helia-verified-fetch/js-test-and-release.yml?branch=main\&style=flat-square)](https://github.com/ipfs/helia-verified-fetch/actions/workflows/js-test-and-release.yml?query=branch%3Amain)

> Interop tests for @helia/verified-fetch

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

Runs interop tests between @helia/verified-fetch and Kubo.

## Example - Testing a new Kubo release

```console
$ npm i @helia/verified-fetch-interop
$ KUBO_BINARY=/path/to/kubo helia-verified-fetch-interop
```

# Install

```console
$ npm i @helia/verified-fetch-interop
```

## Browser `<script>` tag

Loading this module through a script tag will make its exports available as `HeliaVerifiedFetchInterop` in the global namespace.

```html
<script src="https://unpkg.com/@helia/verified-fetch-interop/dist/index.min.js"></script>
```

# API Docs

- <https://ipfs.github.io/helia-verified-fetch/modules/_helia_verified-fetch-interop.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/ipfs/helia-verified-fetch/blob/main/packages/interop/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/ipfs/helia-verified-fetch/blob/main/packages/interop/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribute

Contributions welcome! Please check out [the issues](https://github.com/ipfs/helia-verified-fetch/issues).

Also see our [contributing document](https://github.com/ipfs/community/blob/master/CONTRIBUTING_JS.md) for more information on how we work, and about contributing in general.

Please be aware that all interactions related to this repo are subject to the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/CONTRIBUTING.md)
