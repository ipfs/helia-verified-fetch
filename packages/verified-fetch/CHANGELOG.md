## [@helia/verified-fetch-v2.0.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.5.0...@helia/verified-fetch-2.0.0) (2024-10-14)

### ⚠ BREAKING CHANGES

* upgrade to helia v5 (#107)

### Features

* upgrade to helia v5 ([#107](https://github.com/ipfs/helia-verified-fetch/issues/107)) ([91a6473](https://github.com/ipfs/helia-verified-fetch/commit/91a64735f2e463b723d2cba7a14093a968241f61))

### Bug Fixes

* move release config to package ([#115](https://github.com/ipfs/helia-verified-fetch/issues/115)) ([4078358](https://github.com/ipfs/helia-verified-fetch/commit/4078358de8844eba2358e491e87da6ae94b7a1cd))

### Documentation

* change cidv0 to cidv1 in the readme ([#105](https://github.com/ipfs/helia-verified-fetch/issues/105)) ([060e726](https://github.com/ipfs/helia-verified-fetch/commit/060e7265d7ab3d86cf6d1760e9e5d2789f85eb3d))

### Dependencies

* bump aegir from 42.2.11 to 44.1.4 ([#108](https://github.com/ipfs/helia-verified-fetch/issues/108)) ([e36fbff](https://github.com/ipfs/helia-verified-fetch/commit/e36fbffebee6af272b8fbf5cdcbbe1a46ea6b5c5))

## @helia/verified-fetch [1.5.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.4.3...@helia/verified-fetch-1.5.0) (2024-06-13)


### Features

* use the waterworks trustless gateway by default ([#94](https://github.com/ipfs/helia-verified-fetch/issues/94)) ([2db8d1e](https://github.com/ipfs/helia-verified-fetch/commit/2db8d1eb724cfd7ad55179b8123c0d0e8a205b4c))

## @helia/verified-fetch [1.4.3](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.4.2...@helia/verified-fetch-1.4.3) (2024-05-24)


### Bug Fixes

* gateway conformance improvements ([#85](https://github.com/ipfs/helia-verified-fetch/issues/85)) ([7281078](https://github.com/ipfs/helia-verified-fetch/commit/72810786d7d49f6cc0fbf308717d70cf0740cd4c))

## @helia/verified-fetch [1.4.2](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.4.1...@helia/verified-fetch-1.4.2) (2024-05-16)


### Bug Fixes

* reduce dagPb and dagCbor handler complexity ([#45](https://github.com/ipfs/helia-verified-fetch/issues/45)) ([3b41752](https://github.com/ipfs/helia-verified-fetch/commit/3b41752e120025d67017eb34c40cab3c71346676))

## @helia/verified-fetch [1.4.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.4.0...@helia/verified-fetch-1.4.1) (2024-05-09)


### Documentation

* generate readme ([#70](https://github.com/ipfs/helia-verified-fetch/issues/70)) ([a75567a](https://github.com/ipfs/helia-verified-fetch/commit/a75567a0e90f361d177a60cf8faf9c09fb43234c)), closes [#68](https://github.com/ipfs/helia-verified-fetch/issues/68) [#72](https://github.com/ipfs/helia-verified-fetch/issues/72) [#72](https://github.com/ipfs/helia-verified-fetch/issues/72)

## @helia/verified-fetch [1.4.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.3.14...@helia/verified-fetch-1.4.0) (2024-05-09)


### Features

* use blockstore sessions ([#50](https://github.com/ipfs/helia-verified-fetch/issues/50)) ([541dd64](https://github.com/ipfs/helia-verified-fetch/commit/541dd646b0e83b9c69ed32d7a29e964144ad03cf))

## @helia/verified-fetch [1.3.14](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.3.13...@helia/verified-fetch-1.3.14) (2024-05-02)


### Documentation

* add link to blog post and ready-to-run example ([#63](https://github.com/ipfs/helia-verified-fetch/issues/63)) ([696ed57](https://github.com/ipfs/helia-verified-fetch/commit/696ed5735b99262e27710fa382d0905a42b6a386))

## @helia/verified-fetch [1.3.13](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.3.12...@helia/verified-fetch-1.3.13) (2024-04-20)


### Bug Fixes

* missing paths returns 404 instead of 502 ([#59](https://github.com/ipfs/helia-verified-fetch/issues/59)) ([291a054](https://github.com/ipfs/helia-verified-fetch/commit/291a05476b6cdf274d095f6d35c64302d83eeb37)), closes [#53](https://github.com/ipfs/helia-verified-fetch/issues/53)
* X-Ipfs-Path is set correctly ([#46](https://github.com/ipfs/helia-verified-fetch/issues/46)) ([5bb6685](https://github.com/ipfs/helia-verified-fetch/commit/5bb6685ce64aec0557be7dd13d19658992dc6e61))

## @helia/verified-fetch [1.3.12](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.3.11...@helia/verified-fetch-1.3.12) (2024-04-15)


### Bug Fixes

* use ipfs-unixfs-exporter directly ([#42](https://github.com/ipfs/helia-verified-fetch/issues/42)) ([4532bf1](https://github.com/ipfs/helia-verified-fetch/commit/4532bf1dd6017edae55ec5e8a56e9657e1301f58))

## @helia/verified-fetch [1.3.11](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.3.10...@helia/verified-fetch-1.3.11) (2024-04-15)


### Documentation

* update documented default value ([161a470](https://github.com/ipfs/helia-verified-fetch/commit/161a4707a6e06411eed86ee68d5a07994574f00a)), closes [/github.com/multiformats/js-dns/blob/a56c9e0b953d644392cf10fd0792757da0d61c32/src/resolvers/default.browser.ts#L6-L7](https://github.com/ipfs//github.com/multiformats/js-dns/blob/a56c9e0b953d644392cf10fd0792757da0d61c32/src/resolvers/default.browser.ts/issues/L6-L7)

## @helia/verified-fetch [1.3.10](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.3.9...@helia/verified-fetch-1.3.10) (2024-04-12)


### Documentation

* fix readme link ([#51](https://github.com/ipfs/helia-verified-fetch/issues/51)) ([8a41c57](https://github.com/ipfs/helia-verified-fetch/commit/8a41c5701f800ddac25ae59d790836e5b1c48d93))

## @helia/verified-fetch [1.3.9](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.3.8...@helia/verified-fetch-1.3.9) (2024-04-11)


### Bug Fixes

* identity CIDs use contentTypeParser ([#49](https://github.com/ipfs/helia-verified-fetch/issues/49)) ([3014498](https://github.com/ipfs/helia-verified-fetch/commit/30144981b5253b3269cbf186a24f1ef9dd04a452))

## @helia/verified-fetch [1.3.8](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.3.7...@helia/verified-fetch-1.3.8) (2024-04-09)


### Bug Fixes

* pass url and body to badRequestResponse ([#44](https://github.com/ipfs/helia-verified-fetch/issues/44)) ([cc228e6](https://github.com/ipfs/helia-verified-fetch/commit/cc228e6fe74be0d340dc496191fe1dc06fd24486))


### Dependencies

* updating all deps ([#47](https://github.com/ipfs/helia-verified-fetch/issues/47)) ([6d0ffd8](https://github.com/ipfs/helia-verified-fetch/commit/6d0ffd837e15f1d5bb84a5b2c855d490301ac312))

## @helia/verified-fetch [1.3.7](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.3.6...@helia/verified-fetch-1.3.7) (2024-04-08)


### Bug Fixes

* walking dag-cbor paths ([#39](https://github.com/ipfs/helia-verified-fetch/issues/39)) ([99668ce](https://github.com/ipfs/helia-verified-fetch/commit/99668cef249f223e143e359fb282c00d98b82f28))

## @helia/verified-fetch [1.3.6](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.3.5...@helia/verified-fetch-1.3.6) (2024-04-08)


### Bug Fixes

* implicit accept header can be overridden by format query ([#36](https://github.com/ipfs/helia-verified-fetch/issues/36)) ([75c0b75](https://github.com/ipfs/helia-verified-fetch/commit/75c0b75f1b5d340b68063db0eab94c0228c261c4))

## @helia/verified-fetch [1.3.5](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.3.4...@helia/verified-fetch-1.3.5) (2024-04-08)


### Bug Fixes

* remove redundant abort controller ([#41](https://github.com/ipfs/helia-verified-fetch/issues/41)) ([04b220d](https://github.com/ipfs/helia-verified-fetch/commit/04b220dab3ee9e617eb5ba920f4bb00112d1a861))

## @helia/verified-fetch [1.3.4](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-1.3.3...@helia/verified-fetch-1.3.4) (2024-04-02)


### Bug Fixes

* decodeURIComponent on path parts ([#40](https://github.com/ipfs/helia-verified-fetch/issues/40)) ([f628cf6](https://github.com/ipfs/helia-verified-fetch/commit/f628cf6b20cf5b23aeb37c7493cbd265c3db6b71))

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
