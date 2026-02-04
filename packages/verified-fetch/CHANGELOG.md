## [@helia/verified-fetch-v6.3.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-6.3.0...@helia/verified-fetch-6.3.1) (2026-02-04)

### Bug Fixes

* add providers to session ([#319](https://github.com/ipfs/helia-verified-fetch/issues/319)) ([ec1c339](https://github.com/ipfs/helia-verified-fetch/commit/ec1c339be4a3e1aba0b407b88366d680bcd05029))

## [@helia/verified-fetch-v6.3.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-6.2.2...@helia/verified-fetch-6.3.0) (2026-02-02)

### Features

* allow passing providers to fetch ([#318](https://github.com/ipfs/helia-verified-fetch/issues/318)) ([e887d90](https://github.com/ipfs/helia-verified-fetch/commit/e887d90f52c794c3f6fddfd995599f00766e3bc4))

## [@helia/verified-fetch-v6.2.2](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-6.2.1...@helia/verified-fetch-6.2.2) (2026-01-27)

### Bug Fixes

* return 400 status for invalid parameters ([#316](https://github.com/ipfs/helia-verified-fetch/issues/316)) ([097f950](https://github.com/ipfs/helia-verified-fetch/commit/097f9500fb4f08b8ebf86a7be5f71418a9717b61))

## [@helia/verified-fetch-v6.2.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-6.2.0...@helia/verified-fetch-6.2.1) (2026-01-22)

### Bug Fixes

* requesting json or cbor should be a no-op ([#315](https://github.com/ipfs/helia-verified-fetch/issues/315)) ([18f25fc](https://github.com/ipfs/helia-verified-fetch/commit/18f25fcdc6d6117f838dc77578e83551d4552943))

## [@helia/verified-fetch-v6.2.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-6.1.2...@helia/verified-fetch-6.2.0) (2026-01-18)

### Features

* add tree-shaking-friendly factory function ([#313](https://github.com/ipfs/helia-verified-fetch/issues/313)) ([636bc20](https://github.com/ipfs/helia-verified-fetch/commit/636bc20b9eeb870917f2cd261622c6c2b2004f10))

## [@helia/verified-fetch-v6.1.2](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-6.1.1...@helia/verified-fetch-6.1.2) (2026-01-16)

### Dependencies

* update delegated routing ([#312](https://github.com/ipfs/helia-verified-fetch/issues/312)) ([46d6b2f](https://github.com/ipfs/helia-verified-fetch/commit/46d6b2f16381b09ea0eef1594323345993e6d79a))

## [@helia/verified-fetch-v6.1.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-6.1.0...@helia/verified-fetch-6.1.1) (2026-01-12)

### Dependencies

* update @helia/unixfs to v7 ([#310](https://github.com/ipfs/helia-verified-fetch/issues/310)) ([ea34996](https://github.com/ipfs/helia-verified-fetch/commit/ea3499678b90c7c6166363c60860fa71eac78c7f))

## [@helia/verified-fetch-v6.1.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-6.0.0...@helia/verified-fetch-6.1.0) (2026-01-12)

### Features

* add offline option and support intermediate shards in cars ([#308](https://github.com/ipfs/helia-verified-fetch/issues/308)) ([1237d4e](https://github.com/ipfs/helia-verified-fetch/commit/1237d4e963f7e50959c2b67a09cfba13f172b93a))

## [@helia/verified-fetch-v6.0.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-5.1.1...@helia/verified-fetch-6.0.0) (2026-01-06)

### ⚠ BREAKING CHANGES

* resources must be fetched by IPFS/IPNS URLs or paths, e.g: `ipfs://...` or `/ipfs/...`

### Bug Fixes

* remove gateway url support ([#307](https://github.com/ipfs/helia-verified-fetch/issues/307)) ([c1b6fc3](https://github.com/ipfs/helia-verified-fetch/commit/c1b6fc3f2d35ad8f73cb4a8ce57e94373728bf0e))

## [@helia/verified-fetch-v5.1.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-5.1.0...@helia/verified-fetch-5.1.1) (2025-12-27)

### Bug Fixes

* remove extra log line ([ac9b895](https://github.com/ipfs/helia-verified-fetch/commit/ac9b895491ea27271d46c0742c4185c1e14e8cd0))

## [@helia/verified-fetch-v5.1.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-5.0.4...@helia/verified-fetch-5.1.0) (2025-12-26)

### Features

* support if-none-match ([#306](https://github.com/ipfs/helia-verified-fetch/issues/306)) ([d017dbe](https://github.com/ipfs/helia-verified-fetch/commit/d017dbef54b3fd103efe7e293733dd3752d4acd9))

## [@helia/verified-fetch-v5.0.4](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-5.0.3...@helia/verified-fetch-5.0.4) (2025-12-20)

### Bug Fixes

* show requested accept media types ([#305](https://github.com/ipfs/helia-verified-fetch/issues/305)) ([b25e2bf](https://github.com/ipfs/helia-verified-fetch/commit/b25e2bf5987690a3b7a5c7de592ec52580fcb46b))

## [@helia/verified-fetch-v5.0.3](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-5.0.2...@helia/verified-fetch-5.0.3) (2025-12-20)

### Bug Fixes

* test for error name ([#304](https://github.com/ipfs/helia-verified-fetch/issues/304)) ([fa9b582](https://github.com/ipfs/helia-verified-fetch/commit/fa9b58247e4aea1a784f01d16f0671711156a517))

## [@helia/verified-fetch-v5.0.2](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-5.0.1...@helia/verified-fetch-5.0.2) (2025-12-18)

### Bug Fixes

* report ranges in etags ([#303](https://github.com/ipfs/helia-verified-fetch/issues/303)) ([d5e91bf](https://github.com/ipfs/helia-verified-fetch/commit/d5e91bf215eb4b09b1946dfff857bf6db3d3cf06))

## [@helia/verified-fetch-v5.0.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-5.0.0...@helia/verified-fetch-5.0.1) (2025-12-16)

### Bug Fixes

* check for slash in pathname ([#301](https://github.com/ipfs/helia-verified-fetch/issues/301)) ([70cb95f](https://github.com/ipfs/helia-verified-fetch/commit/70cb95f14baf00a9f6ba494a8e11a5d6b86d3dde))

## [@helia/verified-fetch-v5.0.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-4.1.1...@helia/verified-fetch-5.0.0) (2025-12-15)

### ⚠ BREAKING CHANGES

* support for the `format` query arg has been removed, pass an accept header instead

### Bug Fixes

* remove gateway code ([#299](https://github.com/ipfs/helia-verified-fetch/issues/299)) ([9d2d7c2](https://github.com/ipfs/helia-verified-fetch/commit/9d2d7c279822776af0594570122d7f411ee01859))

## [@helia/verified-fetch-v4.1.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-4.1.0...@helia/verified-fetch-4.1.1) (2025-11-21)

### Bug Fixes

* remove content-disposition header from error responses ([#296](https://github.com/ipfs/helia-verified-fetch/issues/296)) ([f109e77](https://github.com/ipfs/helia-verified-fetch/commit/f109e77e4f513c1693188d819e7479e90ac9bf81))
* replace deprecated method use ([#295](https://github.com/ipfs/helia-verified-fetch/issues/295)) ([2ff9a94](https://github.com/ipfs/helia-verified-fetch/commit/2ff9a94918c38f629a90dd4210f7cb3330637116))

### Trivial Changes

* fix flaky DNS resolver test ([#294](https://github.com/ipfs/helia-verified-fetch/issues/294)) ([cf98769](https://github.com/ipfs/helia-verified-fetch/commit/cf987691f5c8f74338c0e218fd19ee283caf6f60))

## [@helia/verified-fetch-v4.1.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-4.0.5...@helia/verified-fetch-4.1.0) (2025-11-20)

### Features

* support missing car options ([#293](https://github.com/ipfs/helia-verified-fetch/issues/293)) ([266078c](https://github.com/ipfs/helia-verified-fetch/commit/266078c9127be7bcfec25b6e2e4855908255f063))

### Trivial Changes

* bump @types/sinon from 17.0.4 to 21.0.0 ([#288](https://github.com/ipfs/helia-verified-fetch/issues/288)) ([baf8601](https://github.com/ipfs/helia-verified-fetch/commit/baf86012d0524214752a278e87e5a7d7ccdd7742))
* re-enable file-type test ([#291](https://github.com/ipfs/helia-verified-fetch/issues/291)) ([3cbc266](https://github.com/ipfs/helia-verified-fetch/commit/3cbc266ca1085fb4db8e44aca54deace11da837f))

## [@helia/verified-fetch-v4.0.5](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-4.0.4...@helia/verified-fetch-4.0.5) (2025-11-20)

### Bug Fixes

* strip trailing slash from car file name ([#290](https://github.com/ipfs/helia-verified-fetch/issues/290)) ([0a7b07b](https://github.com/ipfs/helia-verified-fetch/commit/0a7b07b3ad13f89cd4279c5f0757f4a102a43ae3))

## [@helia/verified-fetch-v4.0.4](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-4.0.3...@helia/verified-fetch-4.0.4) (2025-11-18)

### Bug Fixes

* improve cbor support ([#289](https://github.com/ipfs/helia-verified-fetch/issues/289)) ([8a29a88](https://github.com/ipfs/helia-verified-fetch/commit/8a29a889eeee49830b48c86336a5d782caa3a5d0))

## [@helia/verified-fetch-v4.0.3](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-4.0.2...@helia/verified-fetch-4.0.3) (2025-11-08)

### Bug Fixes

* use index.html as file name when returning website index ([#285](https://github.com/ipfs/helia-verified-fetch/issues/285)) ([e7a47ca](https://github.com/ipfs/helia-verified-fetch/commit/e7a47ca3c91e2d3a4db2c0045145789252cb7ce4))

## [@helia/verified-fetch-v4.0.2](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-4.0.1...@helia/verified-fetch-4.0.2) (2025-10-31)

### Bug Fixes

* strip URL fragement before resolving DAG path ([#284](https://github.com/ipfs/helia-verified-fetch/issues/284)) ([af5ad0d](https://github.com/ipfs/helia-verified-fetch/commit/af5ad0dae3952f93d9c1ef7aaa711dc8f962cd71)), closes [#271](https://github.com/ipfs/helia-verified-fetch/issues/271)

## [@helia/verified-fetch-v4.0.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-4.0.0...@helia/verified-fetch-4.0.1) (2025-10-27)

### Bug Fixes

* re-use helia's logger ([#283](https://github.com/ipfs/helia-verified-fetch/issues/283)) ([375e1a0](https://github.com/ipfs/helia-verified-fetch/commit/375e1a07a308830db244bf8e0089b183ae8f5945))
* simplify plugin pipeline ([#282](https://github.com/ipfs/helia-verified-fetch/issues/282)) ([6c1e66f](https://github.com/ipfs/helia-verified-fetch/commit/6c1e66f048daf63f672eb641523b0a8de03ede9d))

## [@helia/verified-fetch-v4.0.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-3.2.3...@helia/verified-fetch-4.0.0) (2025-10-20)

### ⚠ BREAKING CHANGES

* upgrade helia to v6 and libp2p to v3 (#278)

### Dependencies

* upgrade helia to v6 and libp2p to v3 ([#278](https://github.com/ipfs/helia-verified-fetch/issues/278)) ([c9a8325](https://github.com/ipfs/helia-verified-fetch/commit/c9a8325efecea50625b6f0ec01370e194c8f0fc7))

## [@helia/verified-fetch-v3.2.3](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-3.2.2...@helia/verified-fetch-3.2.3) (2025-09-18)

### Bug Fixes

* svg content type recognition ([#269](https://github.com/ipfs/helia-verified-fetch/issues/269)) ([84532bc](https://github.com/ipfs/helia-verified-fetch/commit/84532bc743c1126d39677a85aac5a8bc2ce24914))

## [@helia/verified-fetch-v3.2.2](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-3.2.1...@helia/verified-fetch-3.2.2) (2025-09-15)

### Bug Fixes

* do not download all blocks when listing dir ([#261](https://github.com/ipfs/helia-verified-fetch/issues/261)) ([356e62c](https://github.com/ipfs/helia-verified-fetch/commit/356e62c9f9535a15f5903c9e346f7a836441cd14))

## [@helia/verified-fetch-v3.2.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-3.2.0...@helia/verified-fetch-3.2.1) (2025-09-12)

### Tests

* conformance testing more modular, no hangs ([#266](https://github.com/ipfs/helia-verified-fetch/issues/266)) ([ae6e463](https://github.com/ipfs/helia-verified-fetch/commit/ae6e4631c4569dde88ce77f90fb05b05fdc82630))

## [@helia/verified-fetch-v3.2.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-3.1.1...@helia/verified-fetch-3.2.0) (2025-06-17)

### Features

* add dag-cbor HTML preview plugin ([#256](https://github.com/ipfs/helia-verified-fetch/issues/256)) ([8761a3a](https://github.com/ipfs/helia-verified-fetch/commit/8761a3a2e451da3c58d71ac3c22ac1bd390bb884))

## [@helia/verified-fetch-v3.1.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-3.1.0...@helia/verified-fetch-3.1.1) (2025-06-09)

### Bug Fixes

* do not duplicate root block in car files ([#252](https://github.com/ipfs/helia-verified-fetch/issues/252)) ([2ca5a04](https://github.com/ipfs/helia-verified-fetch/commit/2ca5a04403338681ce89be4eb9b085ed1c369519))

## [@helia/verified-fetch-v3.1.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-3.0.2...@helia/verified-fetch-3.1.0) (2025-06-03)

### Features

* support multiple byte-ranges ([#207](https://github.com/ipfs/helia-verified-fetch/issues/207)) ([04aeb5d](https://github.com/ipfs/helia-verified-fetch/commit/04aeb5d693a1fbf4c7de2768c70025500260b063))

## [@helia/verified-fetch-v3.0.2](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-3.0.1...@helia/verified-fetch-3.0.2) (2025-06-02)

### Bug Fixes

* format=car filename and content ([#198](https://github.com/ipfs/helia-verified-fetch/issues/198)) ([432b5f8](https://github.com/ipfs/helia-verified-fetch/commit/432b5f8c42ced9af08b7606fb05ccbadf753144c))

## [@helia/verified-fetch-v3.0.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-3.0.0...@helia/verified-fetch-3.0.1) (2025-05-29)

### Tests

* fix flaky dns and abort tests ([#247](https://github.com/ipfs/helia-verified-fetch/issues/247)) ([3826086](https://github.com/ipfs/helia-verified-fetch/commit/38260865ccecb2d8f8514d96c7d2aa0828fabe67))

## [@helia/verified-fetch-v3.0.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.6.19...@helia/verified-fetch-3.0.0) (2025-05-26)

### ⚠ BREAKING CHANGES

* plugins require a unique id (#244)

### Bug Fixes

* plugins require a unique id ([#244](https://github.com/ipfs/helia-verified-fetch/issues/244)) ([73aabdf](https://github.com/ipfs/helia-verified-fetch/commit/73aabdf4ea4890972396571e34467d4a315e1613))

## [@helia/verified-fetch-v2.6.19](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.6.18...@helia/verified-fetch-2.6.19) (2025-05-23)

### Bug Fixes

* handle aborted requests properly ([#241](https://github.com/ipfs/helia-verified-fetch/issues/241)) ([af4b426](https://github.com/ipfs/helia-verified-fetch/commit/af4b4261b3660f71e5831b9d5ed5e73f5aaebeac))

## [@helia/verified-fetch-v2.6.18](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.6.17...@helia/verified-fetch-2.6.18) (2025-05-21)

### Trivial Changes

* update version ([d32c104](https://github.com/ipfs/helia-verified-fetch/commit/d32c104f9df4666c7d409c45d9c13e3e34a10cd3))

### Dependencies

* bump aegir from 46.0.5 to 47.0.6 ([#236](https://github.com/ipfs/helia-verified-fetch/issues/236)) ([bc3d557](https://github.com/ipfs/helia-verified-fetch/commit/bc3d5574ee6f19a194f9498652b2e354d38020d4))

## [@helia/verified-fetch-v2.6.17](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.6.16...@helia/verified-fetch-2.6.17) (2025-05-14)

### Bug Fixes

* update readmes and bundle sizes ([cb920a5](https://github.com/ipfs/helia-verified-fetch/commit/cb920a57f347cff8e249671660c1fb522f89c8fa))

## [@helia/verified-fetch-v2.6.16](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.6.15...@helia/verified-fetch-2.6.16) (2025-05-14)

### Bug Fixes

* correct all typos and add spell checker ([5db3eec](https://github.com/ipfs/helia-verified-fetch/commit/5db3eec25db10fc4b8d1ec58e2754eb5cf9e61d6))

## [@helia/verified-fetch-v2.6.15](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.6.14...@helia/verified-fetch-2.6.15) (2025-05-14)

### Dependencies

* **dev:** bump aegir from 45.2.1 to 46.0.1 ([5825e4a](https://github.com/ipfs/helia-verified-fetch/commit/5825e4a43566f8c3fe059dbb9e952c4e1ce708a1))

## [@helia/verified-fetch-v2.6.14](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.6.13...@helia/verified-fetch-2.6.14) (2025-05-12)

### Bug Fixes

* ending path is not assumed to be filename ([#229](https://github.com/ipfs/helia-verified-fetch/issues/229)) ([6d24813](https://github.com/ipfs/helia-verified-fetch/commit/6d2481392c312de3a4ff2aee5ca6b686d31541ba)), closes [#228](https://github.com/ipfs/helia-verified-fetch/issues/228)

## [@helia/verified-fetch-v2.6.13](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.6.12...@helia/verified-fetch-2.6.13) (2025-04-29)

### Bug Fixes

* remove abortable-iterator ([#223](https://github.com/ipfs/helia-verified-fetch/issues/223)) ([f17056c](https://github.com/ipfs/helia-verified-fetch/commit/f17056caca65121b13bd012bfbc26ef4c3246226))

## [@helia/verified-fetch-v2.6.12](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.6.11...@helia/verified-fetch-2.6.12) (2025-04-28)

### Bug Fixes

* verified-fetch supports HEAD requests ([#222](https://github.com/ipfs/helia-verified-fetch/issues/222)) ([82b60ce](https://github.com/ipfs/helia-verified-fetch/commit/82b60ce5a124fd081355d24ef0aded0ab9d014c7))

## [@helia/verified-fetch-v2.6.11](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.6.10...@helia/verified-fetch-2.6.11) (2025-04-24)

### Bug Fixes

* verified-fetch handles OPTIONS method ([#221](https://github.com/ipfs/helia-verified-fetch/issues/221)) ([4db2ece](https://github.com/ipfs/helia-verified-fetch/commit/4db2ece43e07f7463f1d4456d6abed5b6d03537c))

## [@helia/verified-fetch-v2.6.10](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.6.9...@helia/verified-fetch-2.6.10) (2025-04-24)

### Bug Fixes

* set CORS headers in verified-fetch ([#220](https://github.com/ipfs/helia-verified-fetch/issues/220)) ([852c7f8](https://github.com/ipfs/helia-verified-fetch/commit/852c7f8712acbc81818b9313c8a54c210d44a372))

## [@helia/verified-fetch-v2.6.9](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.6.8...@helia/verified-fetch-2.6.9) (2025-04-22)

### Dependencies

* update all deps ([#218](https://github.com/ipfs/helia-verified-fetch/issues/218)) ([121f361](https://github.com/ipfs/helia-verified-fetch/commit/121f3612d4e960e366b897bff970fb4a05b80639))

## [@helia/verified-fetch-v2.6.8](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.6.7...@helia/verified-fetch-2.6.8) (2025-04-22)

### Bug Fixes

* dir-index-html plugin sets more expected headers ([#217](https://github.com/ipfs/helia-verified-fetch/issues/217)) ([90c98f5](https://github.com/ipfs/helia-verified-fetch/commit/90c98f5d463fd7ffcfec596b5064c8c1eb55f1ca))

## [@helia/verified-fetch-v2.6.7](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.6.6...@helia/verified-fetch-2.6.7) (2025-04-21)

### Bug Fixes

* aborted signal is handled when walking path ([#214](https://github.com/ipfs/helia-verified-fetch/issues/214)) ([2cbb10d](https://github.com/ipfs/helia-verified-fetch/commit/2cbb10dc2668c885a0653420f7e33de371ef3ccb))

## [@helia/verified-fetch-v2.6.6](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.6.5...@helia/verified-fetch-2.6.6) (2025-04-16)

### Bug Fixes

* add content-length header when possible ([#189](https://github.com/ipfs/helia-verified-fetch/issues/189)) ([52859c5](https://github.com/ipfs/helia-verified-fetch/commit/52859c5ef52ab4b3f99b25b473456a7e16f4ef89))

## [@helia/verified-fetch-v2.6.5](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.6.4...@helia/verified-fetch-2.6.5) (2025-04-11)

### Bug Fixes

* ipns.resolve doesn't error in browsers ([#210](https://github.com/ipfs/helia-verified-fetch/issues/210)) ([abe2e5c](https://github.com/ipfs/helia-verified-fetch/commit/abe2e5ca4337ba11ace33620dc7cf963b94dd741))

## [@helia/verified-fetch-v2.6.4](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.6.3...@helia/verified-fetch-2.6.4) (2025-03-25)

### Bug Fixes

* dir-index-html shorthash links correctly ([#204](https://github.com/ipfs/helia-verified-fetch/issues/204)) ([35fd859](https://github.com/ipfs/helia-verified-fetch/commit/35fd859c11558a19242ac2757dcc9912ff6e449b))

## [@helia/verified-fetch-v2.6.3](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.6.2...@helia/verified-fetch-2.6.3) (2025-03-24)

### Bug Fixes

* recognize text and html ([#203](https://github.com/ipfs/helia-verified-fetch/issues/203)) ([71ed4f7](https://github.com/ipfs/helia-verified-fetch/commit/71ed4f7fb4cc023a67ec7a36a14fceba57735209))

## [@helia/verified-fetch-v2.6.2](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.6.1...@helia/verified-fetch-2.6.2) (2025-03-11)

### Bug Fixes

* etag is path aware ([#197](https://github.com/ipfs/helia-verified-fetch/issues/197)) ([595881a](https://github.com/ipfs/helia-verified-fetch/commit/595881a8bc44e243fa3ac3037661437c600de17e))

## [@helia/verified-fetch-v2.6.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.6.0...@helia/verified-fetch-2.6.1) (2025-03-10)

### Bug Fixes

* migrate from forked file-type to original ([#192](https://github.com/ipfs/helia-verified-fetch/issues/192)) ([28320e1](https://github.com/ipfs/helia-verified-fetch/commit/28320e1a8d9794dc9d7dc27226ee31118f9791c2))

## [@helia/verified-fetch-v2.6.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.5.5...@helia/verified-fetch-2.6.0) (2025-03-10)

### Features

* provide default content-type-parser ([#193](https://github.com/ipfs/helia-verified-fetch/issues/193)) ([945dd01](https://github.com/ipfs/helia-verified-fetch/commit/945dd01778b6978bcf822eab473565ad3edba8dc))

## [@helia/verified-fetch-v2.5.5](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.5.4...@helia/verified-fetch-2.5.5) (2025-03-04)

### Bug Fixes

* byte-range request body size ([#190](https://github.com/ipfs/helia-verified-fetch/issues/190)) ([b128513](https://github.com/ipfs/helia-verified-fetch/commit/b128513f1b3ea952dec7c12deb929a56ea4a9c5a))

## [@helia/verified-fetch-v2.5.4](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.5.3...@helia/verified-fetch-2.5.4) (2025-02-28)

### Tests

* content-type supports json content-type in gwconformance ([#187](https://github.com/ipfs/helia-verified-fetch/issues/187)) ([47acece](https://github.com/ipfs/helia-verified-fetch/commit/47acece09b6d6c17cfe2ad04cb98deccbeebe6be))

## [@helia/verified-fetch-v2.5.3](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.5.2...@helia/verified-fetch-2.5.3) (2025-02-28)

### Bug Fixes

* shorthand url appears and links correctly ([#185](https://github.com/ipfs/helia-verified-fetch/issues/185)) ([b5a762e](https://github.com/ipfs/helia-verified-fetch/commit/b5a762e15cc6c7d6caada994245602b9d68a5415))

## [@helia/verified-fetch-v2.5.2](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.5.1...@helia/verified-fetch-2.5.2) (2025-02-17)

### Dependencies

* bump deps ([#181](https://github.com/ipfs/helia-verified-fetch/issues/181)) ([1a8807e](https://github.com/ipfs/helia-verified-fetch/commit/1a8807ec28cb9cef784120a89b110509da5d5e29))

## [@helia/verified-fetch-v2.5.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.5.0...@helia/verified-fetch-2.5.1) (2025-02-12)

### Bug Fixes

* dir-index-html can render in sw-gateway ([#177](https://github.com/ipfs/helia-verified-fetch/issues/177)) ([bcd066f](https://github.com/ipfs/helia-verified-fetch/commit/bcd066f8ac6bd12e5b62d870016b164b5d1138fe))

## [@helia/verified-fetch-v2.5.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.4.0...@helia/verified-fetch-2.5.0) (2025-02-11)

### Features

* dir index html listing ([#86](https://github.com/ipfs/helia-verified-fetch/issues/86)) ([0521214](https://github.com/ipfs/helia-verified-fetch/commit/05212141c0f009dbdb75b11b74e9c8f50f1dc31d))

## [@helia/verified-fetch-v2.4.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.3.1...@helia/verified-fetch-2.4.0) (2025-01-14)

### Features

* add server timing to responses ([#164](https://github.com/ipfs/helia-verified-fetch/issues/164)) ([0701c71](https://github.com/ipfs/helia-verified-fetch/commit/0701c716d97da747b73f9e86227493dda8a5b015))

## [@helia/verified-fetch-v2.3.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.3.0...@helia/verified-fetch-2.3.1) (2024-12-10)

### Dependencies

* **dev:** bump sinon from 18.0.1 to 19.0.2 in /packages/verified-fetch ([#145](https://github.com/ipfs/helia-verified-fetch/issues/145)) ([d2d597a](https://github.com/ipfs/helia-verified-fetch/commit/d2d597a922a21679b3877a9d01883c69a48bc6dd))

## [@helia/verified-fetch-v2.3.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.2.2...@helia/verified-fetch-2.3.0) (2024-12-05)

### Features

* allow passing custom hashers to verified fetch ([#156](https://github.com/ipfs/helia-verified-fetch/issues/156)) ([212b16d](https://github.com/ipfs/helia-verified-fetch/commit/212b16d574dc60b25c7497f8574e96ad244d93ec))

## [@helia/verified-fetch-v2.2.2](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.2.1...@helia/verified-fetch-2.2.2) (2024-11-22)

### Bug Fixes

* add trace logging of libp2p config ([#151](https://github.com/ipfs/helia-verified-fetch/issues/151)) ([97de1a3](https://github.com/ipfs/helia-verified-fetch/commit/97de1a3bed597c929d617e23f33ddf6c67236459))

## [@helia/verified-fetch-v2.2.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.2.0...@helia/verified-fetch-2.2.1) (2024-11-21)

### Bug Fixes

* do not connect to bootstrap nodes in browsers ([#149](https://github.com/ipfs/helia-verified-fetch/issues/149)) ([f1bd3d4](https://github.com/ipfs/helia-verified-fetch/commit/f1bd3d4fe7bfd575adf260e751647bc14427fc37))

## [@helia/verified-fetch-v2.2.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.1.3...@helia/verified-fetch-2.2.0) (2024-11-21)

### Features

* support p2p retrieval by default ([#130](https://github.com/ipfs/helia-verified-fetch/issues/130)) ([9d33f89](https://github.com/ipfs/helia-verified-fetch/commit/9d33f8996f555fdee73ad3b0b129560c4d5b6cb6))

## [@helia/verified-fetch-v2.1.3](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.1.2...@helia/verified-fetch-2.1.3) (2024-11-20)

### Dependencies

* bump the helia-deps group across 3 directories with 7 updates ([#141](https://github.com/ipfs/helia-verified-fetch/issues/141)) ([d867350](https://github.com/ipfs/helia-verified-fetch/commit/d8673505044e84cc69c36128dc2874f0713853ab))

## [@helia/verified-fetch-v2.1.2](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.1.1...@helia/verified-fetch-2.1.2) (2024-11-18)

### Dependencies

* bump aegir from 44.1.4 to 45.0.1 ([#127](https://github.com/ipfs/helia-verified-fetch/issues/127)) ([53299e0](https://github.com/ipfs/helia-verified-fetch/commit/53299e0d39256e4c8aff22bb4999b1ed36e686ad))

## [@helia/verified-fetch-v2.1.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.1.0...@helia/verified-fetch-2.1.1) (2024-11-14)

### Dependencies

* bump lru-cache from 10.4.3 to 11.0.2 ([#129](https://github.com/ipfs/helia-verified-fetch/issues/129)) ([6c1f9ed](https://github.com/ipfs/helia-verified-fetch/commit/6c1f9ed3f4de3d27a35086c9e72901526e0567e5))

## [@helia/verified-fetch-v2.1.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.0.1...@helia/verified-fetch-2.1.0) (2024-11-13)

### Features

* return IPNSRecords for ipns subdomain URLs ([#131](https://github.com/ipfs/helia-verified-fetch/issues/131)) ([05b7ac6](https://github.com/ipfs/helia-verified-fetch/commit/05b7ac634f2f7be4c287ca4e86654ac1f4fb8125))

## [@helia/verified-fetch-v2.0.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-2.0.0...@helia/verified-fetch-2.0.1) (2024-10-23)

### Bug Fixes

* allow passing cid encoded ipns keys ([#117](https://github.com/ipfs/helia-verified-fetch/issues/117)) ([1836e40](https://github.com/ipfs/helia-verified-fetch/commit/1836e40b9f4f7eded1c28a5d514b0e7a10d00059))

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
