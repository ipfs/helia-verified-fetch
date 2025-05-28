## [@helia/verified-fetch-gateway-conformance-v1.3.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-gateway-conformance-1.3.0...@helia/verified-fetch-gateway-conformance-1.3.1) (2025-05-21)

### Trivial Changes

* update version ([d32c104](https://github.com/ipfs/helia-verified-fetch/commit/d32c104f9df4666c7d409c45d9c13e3e34a10cd3))

### Dependencies

* bump aegir from 46.0.5 to 47.0.6 ([#236](https://github.com/ipfs/helia-verified-fetch/issues/236)) ([bc3d557](https://github.com/ipfs/helia-verified-fetch/commit/bc3d5574ee6f19a194f9498652b2e354d38020d4))

## [@helia/verified-fetch-gateway-conformance-v1.3.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-gateway-conformance-1.2.0...@helia/verified-fetch-gateway-conformance-1.3.0) (2025-05-14)

### Features

* dir index html listing ([#86](https://github.com/ipfs/helia-verified-fetch/issues/86)) ([0521214](https://github.com/ipfs/helia-verified-fetch/commit/05212141c0f009dbdb75b11b74e9c8f50f1dc31d))
* provide default content-type-parser ([#193](https://github.com/ipfs/helia-verified-fetch/issues/193)) ([945dd01](https://github.com/ipfs/helia-verified-fetch/commit/945dd01778b6978bcf822eab473565ad3edba8dc))

### Bug Fixes

* aborted signal is handled when walking path ([#214](https://github.com/ipfs/helia-verified-fetch/issues/214)) ([2cbb10d](https://github.com/ipfs/helia-verified-fetch/commit/2cbb10dc2668c885a0653420f7e33de371ef3ccb))
* add content-length header when possible ([#189](https://github.com/ipfs/helia-verified-fetch/issues/189)) ([52859c5](https://github.com/ipfs/helia-verified-fetch/commit/52859c5ef52ab4b3f99b25b473456a7e16f4ef89))
* correct all typos and add spell checker ([5db3eec](https://github.com/ipfs/helia-verified-fetch/commit/5db3eec25db10fc4b8d1ec58e2754eb5cf9e61d6))
* dir-index-html can render in sw-gateway ([#177](https://github.com/ipfs/helia-verified-fetch/issues/177)) ([bcd066f](https://github.com/ipfs/helia-verified-fetch/commit/bcd066f8ac6bd12e5b62d870016b164b5d1138fe))
* dir-index-html plugin sets more expected headers ([#217](https://github.com/ipfs/helia-verified-fetch/issues/217)) ([90c98f5](https://github.com/ipfs/helia-verified-fetch/commit/90c98f5d463fd7ffcfec596b5064c8c1eb55f1ca))
* go bin path ([#195](https://github.com/ipfs/helia-verified-fetch/issues/195)) ([3df98fc](https://github.com/ipfs/helia-verified-fetch/commit/3df98fc42a059575e9dbb1213c64eef5fafb6855))
* recognize text and html ([#203](https://github.com/ipfs/helia-verified-fetch/issues/203)) ([71ed4f7](https://github.com/ipfs/helia-verified-fetch/commit/71ed4f7fb4cc023a67ec7a36a14fceba57735209))
* set CORS headers in verified-fetch ([#220](https://github.com/ipfs/helia-verified-fetch/issues/220)) ([852c7f8](https://github.com/ipfs/helia-verified-fetch/commit/852c7f8712acbc81818b9313c8a54c210d44a372))
* update readmes and bundle sizes ([cb920a5](https://github.com/ipfs/helia-verified-fetch/commit/cb920a57f347cff8e249671660c1fb522f89c8fa))
* verified-fetch handles OPTIONS method ([#221](https://github.com/ipfs/helia-verified-fetch/issues/221)) ([4db2ece](https://github.com/ipfs/helia-verified-fetch/commit/4db2ece43e07f7463f1d4456d6abed5b6d03537c))
* verified-fetch supports HEAD requests ([#222](https://github.com/ipfs/helia-verified-fetch/issues/222)) ([82b60ce](https://github.com/ipfs/helia-verified-fetch/commit/82b60ce5a124fd081355d24ef0aded0ab9d014c7))

### Trivial Changes

* do not start kubo node if KUBO_GATEWAY is set ([#186](https://github.com/ipfs/helia-verified-fetch/issues/186)) ([6c27b7b](https://github.com/ipfs/helia-verified-fetch/commit/6c27b7b01db23ba5bdfe54678be30d7260a44291))
* **release:** 1.3.0 [skip ci] ([16c1043](https://github.com/ipfs/helia-verified-fetch/commit/16c1043c9d4bf44aad976e2b2268d37f3d482c77))
* **release:** 1.3.0 [skip ci] ([f651ccf](https://github.com/ipfs/helia-verified-fetch/commit/f651ccffe33591fce4592cf3e5474804f473084d))
* **release:** 1.3.0 [skip ci] ([9a137f7](https://github.com/ipfs/helia-verified-fetch/commit/9a137f71bcd482c812fc71527e6ce36801e81728))

### Dependencies

* bump @helia/verified-fetch from 2.1.2 to 2.3.0 ([#161](https://github.com/ipfs/helia-verified-fetch/issues/161)) ([fce96f4](https://github.com/ipfs/helia-verified-fetch/commit/fce96f41832cef903f39ffe2e0632101739f0168))
* bump @libp2p/logger from 4.0.20 to 5.1.4 ([#137](https://github.com/ipfs/helia-verified-fetch/issues/137)) ([5d4d58e](https://github.com/ipfs/helia-verified-fetch/commit/5d4d58efc8128c5fb0fb51450ee2886c6295adf0))
* bump aegir from 42.2.11 to 44.1.4 ([#108](https://github.com/ipfs/helia-verified-fetch/issues/108)) ([e36fbff](https://github.com/ipfs/helia-verified-fetch/commit/e36fbffebee6af272b8fbf5cdcbbe1a46ea6b5c5))
* bump aegir from 44.1.4 to 45.0.1 ([#127](https://github.com/ipfs/helia-verified-fetch/issues/127)) ([53299e0](https://github.com/ipfs/helia-verified-fetch/commit/53299e0d39256e4c8aff22bb4999b1ed36e686ad))
* bump kubo from 0.28.0 to 0.32.0 ([#133](https://github.com/ipfs/helia-verified-fetch/issues/133)) ([f9606e0](https://github.com/ipfs/helia-verified-fetch/commit/f9606e0b1c2b614b4ceb4c748404e9174763df33))
* bump the helia-deps group across 3 directories with 7 updates ([#141](https://github.com/ipfs/helia-verified-fetch/issues/141)) ([d867350](https://github.com/ipfs/helia-verified-fetch/commit/d8673505044e84cc69c36128dc2874f0713853ab))
* bump the kubo-deps group across 3 directories with 2 updates ([#152](https://github.com/ipfs/helia-verified-fetch/issues/152)) ([e20be62](https://github.com/ipfs/helia-verified-fetch/commit/e20be62a16aa81c4728d98f163f7c1de38a943e6))
* bump the store-deps group across 1 directory with 2 updates ([#142](https://github.com/ipfs/helia-verified-fetch/issues/142)) ([30d6253](https://github.com/ipfs/helia-verified-fetch/commit/30d62533e88f1b2c0c83ec1505335dd04e900c1f))
* bump undici from 6.21.0 to 7.1.0 ([#157](https://github.com/ipfs/helia-verified-fetch/issues/157)) ([14fcce0](https://github.com/ipfs/helia-verified-fetch/commit/14fcce03981368b908f6f8a94dda66b588083560))
* **dev:** bump aegir from 45.2.1 to 46.0.1 ([5825e4a](https://github.com/ipfs/helia-verified-fetch/commit/5825e4a43566f8c3fe059dbb9e952c4e1ce708a1))
* update all deps ([#218](https://github.com/ipfs/helia-verified-fetch/issues/218)) ([121f361](https://github.com/ipfs/helia-verified-fetch/commit/121f3612d4e960e366b897bff970fb4a05b80639))

### Tests

* bump conformance successRate for testTar ([#175](https://github.com/ipfs/helia-verified-fetch/issues/175)) ([b81afca](https://github.com/ipfs/helia-verified-fetch/commit/b81afcabe8b57fd9ec42e8de5218da56c97c6a3a))
* content-type supports json content-type in gwconformance ([#187](https://github.com/ipfs/helia-verified-fetch/issues/187)) ([47acece](https://github.com/ipfs/helia-verified-fetch/commit/47acece09b6d6c17cfe2ad04cb98deccbeebe6be))
* gateway conformance failures are easier to debug ([#170](https://github.com/ipfs/helia-verified-fetch/issues/170)) ([6a84282](https://github.com/ipfs/helia-verified-fetch/commit/6a842822c1f4ebfb0ea9d913687007d802de4195))
* only run gwc test suite once ([#215](https://github.com/ipfs/helia-verified-fetch/issues/215)) ([20a794a](https://github.com/ipfs/helia-verified-fetch/commit/20a794aa19f02f407915f2edaf943120aef1c914))

## [@helia/verified-fetch-gateway-conformance-v1.3.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-gateway-conformance-1.2.0...@helia/verified-fetch-gateway-conformance-1.3.0) (2025-05-14)

### Features

* dir index html listing ([#86](https://github.com/ipfs/helia-verified-fetch/issues/86)) ([0521214](https://github.com/ipfs/helia-verified-fetch/commit/05212141c0f009dbdb75b11b74e9c8f50f1dc31d))
* provide default content-type-parser ([#193](https://github.com/ipfs/helia-verified-fetch/issues/193)) ([945dd01](https://github.com/ipfs/helia-verified-fetch/commit/945dd01778b6978bcf822eab473565ad3edba8dc))

### Bug Fixes

* aborted signal is handled when walking path ([#214](https://github.com/ipfs/helia-verified-fetch/issues/214)) ([2cbb10d](https://github.com/ipfs/helia-verified-fetch/commit/2cbb10dc2668c885a0653420f7e33de371ef3ccb))
* add content-length header when possible ([#189](https://github.com/ipfs/helia-verified-fetch/issues/189)) ([52859c5](https://github.com/ipfs/helia-verified-fetch/commit/52859c5ef52ab4b3f99b25b473456a7e16f4ef89))
* correct all typos and add spell checker ([5db3eec](https://github.com/ipfs/helia-verified-fetch/commit/5db3eec25db10fc4b8d1ec58e2754eb5cf9e61d6))
* dir-index-html can render in sw-gateway ([#177](https://github.com/ipfs/helia-verified-fetch/issues/177)) ([bcd066f](https://github.com/ipfs/helia-verified-fetch/commit/bcd066f8ac6bd12e5b62d870016b164b5d1138fe))
* dir-index-html plugin sets more expected headers ([#217](https://github.com/ipfs/helia-verified-fetch/issues/217)) ([90c98f5](https://github.com/ipfs/helia-verified-fetch/commit/90c98f5d463fd7ffcfec596b5064c8c1eb55f1ca))
* go bin path ([#195](https://github.com/ipfs/helia-verified-fetch/issues/195)) ([3df98fc](https://github.com/ipfs/helia-verified-fetch/commit/3df98fc42a059575e9dbb1213c64eef5fafb6855))
* recognize text and html ([#203](https://github.com/ipfs/helia-verified-fetch/issues/203)) ([71ed4f7](https://github.com/ipfs/helia-verified-fetch/commit/71ed4f7fb4cc023a67ec7a36a14fceba57735209))
* set CORS headers in verified-fetch ([#220](https://github.com/ipfs/helia-verified-fetch/issues/220)) ([852c7f8](https://github.com/ipfs/helia-verified-fetch/commit/852c7f8712acbc81818b9313c8a54c210d44a372))
* verified-fetch handles OPTIONS method ([#221](https://github.com/ipfs/helia-verified-fetch/issues/221)) ([4db2ece](https://github.com/ipfs/helia-verified-fetch/commit/4db2ece43e07f7463f1d4456d6abed5b6d03537c))
* verified-fetch supports HEAD requests ([#222](https://github.com/ipfs/helia-verified-fetch/issues/222)) ([82b60ce](https://github.com/ipfs/helia-verified-fetch/commit/82b60ce5a124fd081355d24ef0aded0ab9d014c7))

### Trivial Changes

* do not start kubo node if KUBO_GATEWAY is set ([#186](https://github.com/ipfs/helia-verified-fetch/issues/186)) ([6c27b7b](https://github.com/ipfs/helia-verified-fetch/commit/6c27b7b01db23ba5bdfe54678be30d7260a44291))
* **release:** 1.3.0 [skip ci] ([f651ccf](https://github.com/ipfs/helia-verified-fetch/commit/f651ccffe33591fce4592cf3e5474804f473084d))
* **release:** 1.3.0 [skip ci] ([9a137f7](https://github.com/ipfs/helia-verified-fetch/commit/9a137f71bcd482c812fc71527e6ce36801e81728))

### Dependencies

* bump @helia/verified-fetch from 2.1.2 to 2.3.0 ([#161](https://github.com/ipfs/helia-verified-fetch/issues/161)) ([fce96f4](https://github.com/ipfs/helia-verified-fetch/commit/fce96f41832cef903f39ffe2e0632101739f0168))
* bump @libp2p/logger from 4.0.20 to 5.1.4 ([#137](https://github.com/ipfs/helia-verified-fetch/issues/137)) ([5d4d58e](https://github.com/ipfs/helia-verified-fetch/commit/5d4d58efc8128c5fb0fb51450ee2886c6295adf0))
* bump aegir from 42.2.11 to 44.1.4 ([#108](https://github.com/ipfs/helia-verified-fetch/issues/108)) ([e36fbff](https://github.com/ipfs/helia-verified-fetch/commit/e36fbffebee6af272b8fbf5cdcbbe1a46ea6b5c5))
* bump aegir from 44.1.4 to 45.0.1 ([#127](https://github.com/ipfs/helia-verified-fetch/issues/127)) ([53299e0](https://github.com/ipfs/helia-verified-fetch/commit/53299e0d39256e4c8aff22bb4999b1ed36e686ad))
* bump kubo from 0.28.0 to 0.32.0 ([#133](https://github.com/ipfs/helia-verified-fetch/issues/133)) ([f9606e0](https://github.com/ipfs/helia-verified-fetch/commit/f9606e0b1c2b614b4ceb4c748404e9174763df33))
* bump the helia-deps group across 3 directories with 7 updates ([#141](https://github.com/ipfs/helia-verified-fetch/issues/141)) ([d867350](https://github.com/ipfs/helia-verified-fetch/commit/d8673505044e84cc69c36128dc2874f0713853ab))
* bump the kubo-deps group across 3 directories with 2 updates ([#152](https://github.com/ipfs/helia-verified-fetch/issues/152)) ([e20be62](https://github.com/ipfs/helia-verified-fetch/commit/e20be62a16aa81c4728d98f163f7c1de38a943e6))
* bump the store-deps group across 1 directory with 2 updates ([#142](https://github.com/ipfs/helia-verified-fetch/issues/142)) ([30d6253](https://github.com/ipfs/helia-verified-fetch/commit/30d62533e88f1b2c0c83ec1505335dd04e900c1f))
* bump undici from 6.21.0 to 7.1.0 ([#157](https://github.com/ipfs/helia-verified-fetch/issues/157)) ([14fcce0](https://github.com/ipfs/helia-verified-fetch/commit/14fcce03981368b908f6f8a94dda66b588083560))
* **dev:** bump aegir from 45.2.1 to 46.0.1 ([5825e4a](https://github.com/ipfs/helia-verified-fetch/commit/5825e4a43566f8c3fe059dbb9e952c4e1ce708a1))
* update all deps ([#218](https://github.com/ipfs/helia-verified-fetch/issues/218)) ([121f361](https://github.com/ipfs/helia-verified-fetch/commit/121f3612d4e960e366b897bff970fb4a05b80639))

### Tests

* bump conformance successRate for testTar ([#175](https://github.com/ipfs/helia-verified-fetch/issues/175)) ([b81afca](https://github.com/ipfs/helia-verified-fetch/commit/b81afcabe8b57fd9ec42e8de5218da56c97c6a3a))
* content-type supports json content-type in gwconformance ([#187](https://github.com/ipfs/helia-verified-fetch/issues/187)) ([47acece](https://github.com/ipfs/helia-verified-fetch/commit/47acece09b6d6c17cfe2ad04cb98deccbeebe6be))
* gateway conformance failures are easier to debug ([#170](https://github.com/ipfs/helia-verified-fetch/issues/170)) ([6a84282](https://github.com/ipfs/helia-verified-fetch/commit/6a842822c1f4ebfb0ea9d913687007d802de4195))
* only run gwc test suite once ([#215](https://github.com/ipfs/helia-verified-fetch/issues/215)) ([20a794a](https://github.com/ipfs/helia-verified-fetch/commit/20a794aa19f02f407915f2edaf943120aef1c914))

## [@helia/verified-fetch-gateway-conformance-v1.3.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-gateway-conformance-1.2.0...@helia/verified-fetch-gateway-conformance-1.3.0) (2025-05-14)

### Features

* dir index html listing ([#86](https://github.com/ipfs/helia-verified-fetch/issues/86)) ([0521214](https://github.com/ipfs/helia-verified-fetch/commit/05212141c0f009dbdb75b11b74e9c8f50f1dc31d))
* provide default content-type-parser ([#193](https://github.com/ipfs/helia-verified-fetch/issues/193)) ([945dd01](https://github.com/ipfs/helia-verified-fetch/commit/945dd01778b6978bcf822eab473565ad3edba8dc))

### Bug Fixes

* aborted signal is handled when walking path ([#214](https://github.com/ipfs/helia-verified-fetch/issues/214)) ([2cbb10d](https://github.com/ipfs/helia-verified-fetch/commit/2cbb10dc2668c885a0653420f7e33de371ef3ccb))
* add content-length header when possible ([#189](https://github.com/ipfs/helia-verified-fetch/issues/189)) ([52859c5](https://github.com/ipfs/helia-verified-fetch/commit/52859c5ef52ab4b3f99b25b473456a7e16f4ef89))
* dir-index-html can render in sw-gateway ([#177](https://github.com/ipfs/helia-verified-fetch/issues/177)) ([bcd066f](https://github.com/ipfs/helia-verified-fetch/commit/bcd066f8ac6bd12e5b62d870016b164b5d1138fe))
* dir-index-html plugin sets more expected headers ([#217](https://github.com/ipfs/helia-verified-fetch/issues/217)) ([90c98f5](https://github.com/ipfs/helia-verified-fetch/commit/90c98f5d463fd7ffcfec596b5064c8c1eb55f1ca))
* go bin path ([#195](https://github.com/ipfs/helia-verified-fetch/issues/195)) ([3df98fc](https://github.com/ipfs/helia-verified-fetch/commit/3df98fc42a059575e9dbb1213c64eef5fafb6855))
* recognize text and html ([#203](https://github.com/ipfs/helia-verified-fetch/issues/203)) ([71ed4f7](https://github.com/ipfs/helia-verified-fetch/commit/71ed4f7fb4cc023a67ec7a36a14fceba57735209))
* set CORS headers in verified-fetch ([#220](https://github.com/ipfs/helia-verified-fetch/issues/220)) ([852c7f8](https://github.com/ipfs/helia-verified-fetch/commit/852c7f8712acbc81818b9313c8a54c210d44a372))
* verified-fetch handles OPTIONS method ([#221](https://github.com/ipfs/helia-verified-fetch/issues/221)) ([4db2ece](https://github.com/ipfs/helia-verified-fetch/commit/4db2ece43e07f7463f1d4456d6abed5b6d03537c))
* verified-fetch supports HEAD requests ([#222](https://github.com/ipfs/helia-verified-fetch/issues/222)) ([82b60ce](https://github.com/ipfs/helia-verified-fetch/commit/82b60ce5a124fd081355d24ef0aded0ab9d014c7))

### Trivial Changes

* do not start kubo node if KUBO_GATEWAY is set ([#186](https://github.com/ipfs/helia-verified-fetch/issues/186)) ([6c27b7b](https://github.com/ipfs/helia-verified-fetch/commit/6c27b7b01db23ba5bdfe54678be30d7260a44291))
* **release:** 1.3.0 [skip ci] ([9a137f7](https://github.com/ipfs/helia-verified-fetch/commit/9a137f71bcd482c812fc71527e6ce36801e81728))

### Dependencies

* bump @helia/verified-fetch from 2.1.2 to 2.3.0 ([#161](https://github.com/ipfs/helia-verified-fetch/issues/161)) ([fce96f4](https://github.com/ipfs/helia-verified-fetch/commit/fce96f41832cef903f39ffe2e0632101739f0168))
* bump @libp2p/logger from 4.0.20 to 5.1.4 ([#137](https://github.com/ipfs/helia-verified-fetch/issues/137)) ([5d4d58e](https://github.com/ipfs/helia-verified-fetch/commit/5d4d58efc8128c5fb0fb51450ee2886c6295adf0))
* bump aegir from 42.2.11 to 44.1.4 ([#108](https://github.com/ipfs/helia-verified-fetch/issues/108)) ([e36fbff](https://github.com/ipfs/helia-verified-fetch/commit/e36fbffebee6af272b8fbf5cdcbbe1a46ea6b5c5))
* bump aegir from 44.1.4 to 45.0.1 ([#127](https://github.com/ipfs/helia-verified-fetch/issues/127)) ([53299e0](https://github.com/ipfs/helia-verified-fetch/commit/53299e0d39256e4c8aff22bb4999b1ed36e686ad))
* bump kubo from 0.28.0 to 0.32.0 ([#133](https://github.com/ipfs/helia-verified-fetch/issues/133)) ([f9606e0](https://github.com/ipfs/helia-verified-fetch/commit/f9606e0b1c2b614b4ceb4c748404e9174763df33))
* bump the helia-deps group across 3 directories with 7 updates ([#141](https://github.com/ipfs/helia-verified-fetch/issues/141)) ([d867350](https://github.com/ipfs/helia-verified-fetch/commit/d8673505044e84cc69c36128dc2874f0713853ab))
* bump the kubo-deps group across 3 directories with 2 updates ([#152](https://github.com/ipfs/helia-verified-fetch/issues/152)) ([e20be62](https://github.com/ipfs/helia-verified-fetch/commit/e20be62a16aa81c4728d98f163f7c1de38a943e6))
* bump the store-deps group across 1 directory with 2 updates ([#142](https://github.com/ipfs/helia-verified-fetch/issues/142)) ([30d6253](https://github.com/ipfs/helia-verified-fetch/commit/30d62533e88f1b2c0c83ec1505335dd04e900c1f))
* bump undici from 6.21.0 to 7.1.0 ([#157](https://github.com/ipfs/helia-verified-fetch/issues/157)) ([14fcce0](https://github.com/ipfs/helia-verified-fetch/commit/14fcce03981368b908f6f8a94dda66b588083560))
* **dev:** bump aegir from 45.2.1 to 46.0.1 ([5825e4a](https://github.com/ipfs/helia-verified-fetch/commit/5825e4a43566f8c3fe059dbb9e952c4e1ce708a1))
* update all deps ([#218](https://github.com/ipfs/helia-verified-fetch/issues/218)) ([121f361](https://github.com/ipfs/helia-verified-fetch/commit/121f3612d4e960e366b897bff970fb4a05b80639))

### Tests

* bump conformance successRate for testTar ([#175](https://github.com/ipfs/helia-verified-fetch/issues/175)) ([b81afca](https://github.com/ipfs/helia-verified-fetch/commit/b81afcabe8b57fd9ec42e8de5218da56c97c6a3a))
* content-type supports json content-type in gwconformance ([#187](https://github.com/ipfs/helia-verified-fetch/issues/187)) ([47acece](https://github.com/ipfs/helia-verified-fetch/commit/47acece09b6d6c17cfe2ad04cb98deccbeebe6be))
* gateway conformance failures are easier to debug ([#170](https://github.com/ipfs/helia-verified-fetch/issues/170)) ([6a84282](https://github.com/ipfs/helia-verified-fetch/commit/6a842822c1f4ebfb0ea9d913687007d802de4195))
* only run gwc test suite once ([#215](https://github.com/ipfs/helia-verified-fetch/issues/215)) ([20a794a](https://github.com/ipfs/helia-verified-fetch/commit/20a794aa19f02f407915f2edaf943120aef1c914))

## [@helia/verified-fetch-gateway-conformance-v1.3.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-gateway-conformance-1.2.0...@helia/verified-fetch-gateway-conformance-1.3.0) (2025-05-14)

### Features

* dir index html listing ([#86](https://github.com/ipfs/helia-verified-fetch/issues/86)) ([0521214](https://github.com/ipfs/helia-verified-fetch/commit/05212141c0f009dbdb75b11b74e9c8f50f1dc31d))
* provide default content-type-parser ([#193](https://github.com/ipfs/helia-verified-fetch/issues/193)) ([945dd01](https://github.com/ipfs/helia-verified-fetch/commit/945dd01778b6978bcf822eab473565ad3edba8dc))

### Bug Fixes

* aborted signal is handled when walking path ([#214](https://github.com/ipfs/helia-verified-fetch/issues/214)) ([2cbb10d](https://github.com/ipfs/helia-verified-fetch/commit/2cbb10dc2668c885a0653420f7e33de371ef3ccb))
* add content-length header when possible ([#189](https://github.com/ipfs/helia-verified-fetch/issues/189)) ([52859c5](https://github.com/ipfs/helia-verified-fetch/commit/52859c5ef52ab4b3f99b25b473456a7e16f4ef89))
* dir-index-html can render in sw-gateway ([#177](https://github.com/ipfs/helia-verified-fetch/issues/177)) ([bcd066f](https://github.com/ipfs/helia-verified-fetch/commit/bcd066f8ac6bd12e5b62d870016b164b5d1138fe))
* dir-index-html plugin sets more expected headers ([#217](https://github.com/ipfs/helia-verified-fetch/issues/217)) ([90c98f5](https://github.com/ipfs/helia-verified-fetch/commit/90c98f5d463fd7ffcfec596b5064c8c1eb55f1ca))
* go bin path ([#195](https://github.com/ipfs/helia-verified-fetch/issues/195)) ([3df98fc](https://github.com/ipfs/helia-verified-fetch/commit/3df98fc42a059575e9dbb1213c64eef5fafb6855))
* recognize text and html ([#203](https://github.com/ipfs/helia-verified-fetch/issues/203)) ([71ed4f7](https://github.com/ipfs/helia-verified-fetch/commit/71ed4f7fb4cc023a67ec7a36a14fceba57735209))
* set CORS headers in verified-fetch ([#220](https://github.com/ipfs/helia-verified-fetch/issues/220)) ([852c7f8](https://github.com/ipfs/helia-verified-fetch/commit/852c7f8712acbc81818b9313c8a54c210d44a372))
* verified-fetch handles OPTIONS method ([#221](https://github.com/ipfs/helia-verified-fetch/issues/221)) ([4db2ece](https://github.com/ipfs/helia-verified-fetch/commit/4db2ece43e07f7463f1d4456d6abed5b6d03537c))
* verified-fetch supports HEAD requests ([#222](https://github.com/ipfs/helia-verified-fetch/issues/222)) ([82b60ce](https://github.com/ipfs/helia-verified-fetch/commit/82b60ce5a124fd081355d24ef0aded0ab9d014c7))

### Trivial Changes

* do not start kubo node if KUBO_GATEWAY is set ([#186](https://github.com/ipfs/helia-verified-fetch/issues/186)) ([6c27b7b](https://github.com/ipfs/helia-verified-fetch/commit/6c27b7b01db23ba5bdfe54678be30d7260a44291))

### Dependencies

* bump @helia/verified-fetch from 2.1.2 to 2.3.0 ([#161](https://github.com/ipfs/helia-verified-fetch/issues/161)) ([fce96f4](https://github.com/ipfs/helia-verified-fetch/commit/fce96f41832cef903f39ffe2e0632101739f0168))
* bump @libp2p/logger from 4.0.20 to 5.1.4 ([#137](https://github.com/ipfs/helia-verified-fetch/issues/137)) ([5d4d58e](https://github.com/ipfs/helia-verified-fetch/commit/5d4d58efc8128c5fb0fb51450ee2886c6295adf0))
* bump aegir from 42.2.11 to 44.1.4 ([#108](https://github.com/ipfs/helia-verified-fetch/issues/108)) ([e36fbff](https://github.com/ipfs/helia-verified-fetch/commit/e36fbffebee6af272b8fbf5cdcbbe1a46ea6b5c5))
* bump aegir from 44.1.4 to 45.0.1 ([#127](https://github.com/ipfs/helia-verified-fetch/issues/127)) ([53299e0](https://github.com/ipfs/helia-verified-fetch/commit/53299e0d39256e4c8aff22bb4999b1ed36e686ad))
* bump kubo from 0.28.0 to 0.32.0 ([#133](https://github.com/ipfs/helia-verified-fetch/issues/133)) ([f9606e0](https://github.com/ipfs/helia-verified-fetch/commit/f9606e0b1c2b614b4ceb4c748404e9174763df33))
* bump the helia-deps group across 3 directories with 7 updates ([#141](https://github.com/ipfs/helia-verified-fetch/issues/141)) ([d867350](https://github.com/ipfs/helia-verified-fetch/commit/d8673505044e84cc69c36128dc2874f0713853ab))
* bump the kubo-deps group across 3 directories with 2 updates ([#152](https://github.com/ipfs/helia-verified-fetch/issues/152)) ([e20be62](https://github.com/ipfs/helia-verified-fetch/commit/e20be62a16aa81c4728d98f163f7c1de38a943e6))
* bump the store-deps group across 1 directory with 2 updates ([#142](https://github.com/ipfs/helia-verified-fetch/issues/142)) ([30d6253](https://github.com/ipfs/helia-verified-fetch/commit/30d62533e88f1b2c0c83ec1505335dd04e900c1f))
* bump undici from 6.21.0 to 7.1.0 ([#157](https://github.com/ipfs/helia-verified-fetch/issues/157)) ([14fcce0](https://github.com/ipfs/helia-verified-fetch/commit/14fcce03981368b908f6f8a94dda66b588083560))
* **dev:** bump aegir from 45.2.1 to 46.0.1 ([5825e4a](https://github.com/ipfs/helia-verified-fetch/commit/5825e4a43566f8c3fe059dbb9e952c4e1ce708a1))
* update all deps ([#218](https://github.com/ipfs/helia-verified-fetch/issues/218)) ([121f361](https://github.com/ipfs/helia-verified-fetch/commit/121f3612d4e960e366b897bff970fb4a05b80639))

### Tests

* bump conformance successRate for testTar ([#175](https://github.com/ipfs/helia-verified-fetch/issues/175)) ([b81afca](https://github.com/ipfs/helia-verified-fetch/commit/b81afcabe8b57fd9ec42e8de5218da56c97c6a3a))
* content-type supports json content-type in gwconformance ([#187](https://github.com/ipfs/helia-verified-fetch/issues/187)) ([47acece](https://github.com/ipfs/helia-verified-fetch/commit/47acece09b6d6c17cfe2ad04cb98deccbeebe6be))
* gateway conformance failures are easier to debug ([#170](https://github.com/ipfs/helia-verified-fetch/issues/170)) ([6a84282](https://github.com/ipfs/helia-verified-fetch/commit/6a842822c1f4ebfb0ea9d913687007d802de4195))
* only run gwc test suite once ([#215](https://github.com/ipfs/helia-verified-fetch/issues/215)) ([20a794a](https://github.com/ipfs/helia-verified-fetch/commit/20a794aa19f02f407915f2edaf943120aef1c914))

## @helia/verified-fetch-gateway-conformance [1.2.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-gateway-conformance-1.1.2...@helia/verified-fetch-gateway-conformance-1.2.0) (2024-06-13)



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.5.0

## @helia/verified-fetch-gateway-conformance [1.1.2](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-gateway-conformance-1.1.1...@helia/verified-fetch-gateway-conformance-1.1.2) (2024-05-24)


### Bug Fixes

* gateway conformance improvements ([#85](https://github.com/ipfs/helia-verified-fetch/issues/85)) ([7281078](https://github.com/ipfs/helia-verified-fetch/commit/72810786d7d49f6cc0fbf308717d70cf0740cd4c))



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.4.3

## @helia/verified-fetch-gateway-conformance [1.1.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-gateway-conformance-1.1.0...@helia/verified-fetch-gateway-conformance-1.1.1) (2024-05-16)


### Tests

* use successRate for gateway conformance tests ([#83](https://github.com/ipfs/helia-verified-fetch/issues/83)) ([5f71a33](https://github.com/ipfs/helia-verified-fetch/commit/5f71a334cdaa30bca559796fe54e37629cde0e4f))

## @helia/verified-fetch-gateway-conformance [1.1.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-gateway-conformance-1.0.1...@helia/verified-fetch-gateway-conformance-1.1.0) (2024-05-16)



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.4.2

## @helia/verified-fetch-gateway-conformance [1.0.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-gateway-conformance-1.0.0...@helia/verified-fetch-gateway-conformance-1.0.1) (2024-05-16)


### Bug Fixes

* gateway conformance tests ([#81](https://github.com/ipfs/helia-verified-fetch/issues/81)) ([d0a3b6b](https://github.com/ipfs/helia-verified-fetch/commit/d0a3b6b5c6a7955fe18a0feadff9fda9a46dee71))

## @helia/verified-fetch-gateway-conformance 1.0.0 (2024-05-09)


### Tests

* add gateway conformance tests ([#67](https://github.com/ipfs/helia-verified-fetch/issues/67)) ([30958fb](https://github.com/ipfs/helia-verified-fetch/commit/30958fbe86f0b852aba6dffc4cac93087cbcc2e3)), closes [#68](https://github.com/ipfs/helia-verified-fetch/issues/68)
