## @helia/verified-fetch [1.3.3](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.3.2...@helia/verified-fetch-1.3.3) (2024-03-28)


### Bug Fixes

* ttl and caching for ipns urls ([#34](https://github.com/ipfs/helia-verified-fetch/issues/34)) ([44ac5a1](https://github.com/ipfs/helia-verified-fetch/commit/44ac5a1f0b8ade5943bd688fcd5132a44dcc5c9e))

## @helia/verified-fetch [1.3.2](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.3.1...@helia/verified-fetch-1.3.2) (2024-03-25)


### Bug Fixes

* unixfs dir redirect ([#33](https://github.com/ipfs/helia-verified-fetch/issues/33)) ([32ca87f](https://github.com/ipfs/helia-verified-fetch/commit/32ca87f74840410a435412da64c8e22208fa2ec2))

## @helia/verified-fetch [1.3.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.3.0...@helia/verified-fetch-1.3.1) (2024-03-22)


### Bug Fixes

* aborted signals throw libp2p AbortError ([#30](https://github.com/ipfs/helia-verified-fetch/issues/30)) ([4575791](https://github.com/ipfs/helia-verified-fetch/commit/4575791816d67634e802e461ef524a3d9b27de3f))

## @helia/verified-fetch [1.3.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.2.1...@helia/verified-fetch-1.3.0) (2024-03-21)


### Features

* abort signals are respected ([#26](https://github.com/ipfs/helia-verified-fetch/issues/26)) ([30148fe](https://github.com/ipfs/helia-verified-fetch/commit/30148fe6c894fd8879ccbb1ae66e3e72b2233de7))


### Bug Fixes

* set cache-control header correctly ([#19](https://github.com/ipfs/helia-verified-fetch/issues/19)) ([114f3a4](https://github.com/ipfs/helia-verified-fetch/commit/114f3a45fb2682d5202f80f41ecef9ed013f7b00)), closes [#17](https://github.com/ipfs/helia-verified-fetch/issues/17) [#23](https://github.com/ipfs/helia-verified-fetch/issues/23) [#10](https://github.com/ipfs/helia-verified-fetch/issues/10)

## @helia/verified-fetch [1.2.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.2.0...@helia/verified-fetch-1.2.1) (2024-03-18)


### Bug Fixes

* byte range request end should never equal file size ([#24](https://github.com/ipfs/helia-verified-fetch/issues/24)) ([aafc567](https://github.com/ipfs/helia-verified-fetch/commit/aafc567ded60e8c3702ae91383c049d26ca40784))

## @helia/verified-fetch [1.2.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.1.3...@helia/verified-fetch-1.2.0) (2024-03-15)


### Features

* support http range header ([#10](https://github.com/ipfs/helia-verified-fetch/issues/10)) ([9f5078a](https://github.com/ipfs/helia-verified-fetch/commit/9f5078a09846ba6569d637ea1dd90a6d8fb4e629))


### Trivial Changes

* fix build ([#22](https://github.com/ipfs/helia-verified-fetch/issues/22)) ([01261fe](https://github.com/ipfs/helia-verified-fetch/commit/01261feabd4397c10446609b072a7cb97fb81911))

## @helia/verified-fetch [1.1.3](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.1.2...@helia/verified-fetch-1.1.3) (2024-03-14)


### Bug Fixes

* update @helia/ipns and dns config ([#18](https://github.com/ipfs/helia-verified-fetch/issues/18)) ([9f88c54](https://github.com/ipfs/helia-verified-fetch/commit/9f88c5492f3418143c9b69907b212d29ecec4f91))

## @helia/verified-fetch [1.1.2](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.1.1...@helia/verified-fetch-1.1.2) (2024-03-11)


### Bug Fixes

* support https?://<dnsLink>.ipns.<gateway> urls ([#16](https://github.com/ipfs/helia-verified-fetch/issues/16)) ([0ece19a](https://github.com/ipfs/helia-verified-fetch/commit/0ece19a4bd355d75e52390bb5c8fdb477e99293b))

## @helia/verified-fetch [1.1.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.1.0...@helia/verified-fetch-1.1.1) (2024-03-08)


### Trivial Changes

* add tests for directory redirects for gateways ([#15](https://github.com/ipfs/helia-verified-fetch/issues/15)) ([269609d](https://github.com/ipfs/helia-verified-fetch/commit/269609d189864be4306cb4df5ad235ed9b91fdb8))


### Documentation

* update api docs link in readme ([#14](https://github.com/ipfs/helia-verified-fetch/issues/14)) ([d615633](https://github.com/ipfs/helia-verified-fetch/commit/d615633dcc6a04f78975863df49733dccb9fbb98))

## @helia/verified-fetch [1.1.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.0.2...@helia/verified-fetch-1.1.0) (2024-03-03)


### Features

* support IPFS/IPNS paths, Gateways, etc ([#4](https://github.com/ipfs/helia-verified-fetch/issues/4)) ([e7f1816](https://github.com/ipfs/helia-verified-fetch/commit/e7f18165937e3eb9b034c60cd7ed4db22801a022))
* support redirects for UnixFS directories ([#5](https://github.com/ipfs/helia-verified-fetch/issues/5)) ([4601d46](https://github.com/ipfs/helia-verified-fetch/commit/4601d468eedb4559d409ea8698ee6f580d1c6d02))


### Trivial Changes

* unskip IPNS test ([#6](https://github.com/ipfs/helia-verified-fetch/issues/6)) ([76485a4](https://github.com/ipfs/helia-verified-fetch/commit/76485a41bc29d8984717aa6ce465578a79fd29c7))

## @helia/verified-fetch [1.0.2](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.0.1...@helia/verified-fetch-1.0.2) (2024-02-29)


### Bug Fixes

* append query path to path resolved from IPNS name ([#3](https://github.com/ipfs/helia-verified-fetch/issues/3)) ([fd86e6a](https://github.com/ipfs/helia-verified-fetch/commit/fd86e6acec708f44d46327397c82de36a06af741))

## @helia/verified-fetch [1.0.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.0.0...@helia/verified-fetch-1.0.1) (2024-02-29)


### Bug Fixes

* do not coerce `undefined` to `null` for JSON serialization ([#2](https://github.com/ipfs/helia-verified-fetch/issues/2)) ([d36ce29](https://github.com/ipfs/helia-verified-fetch/commit/d36ce29d707df51364571141ad799b93146d9df0))

## @helia/verified-fetch 1.0.0 (2024-02-28)


### Bug Fixes

* add interop tests and update project config ([fdc83b8](https://github.com/ipfs/helia-verified-fetch/commit/fdc83b8869066a961ae346f153e4b6b486091f01))
