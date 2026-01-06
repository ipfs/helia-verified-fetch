## [@helia/verified-fetch-interop-v4.0.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-3.0.0...@helia/verified-fetch-interop-4.0.0) (2026-01-06)

### ⚠ BREAKING CHANGES

* resources must be fetched by IPFS/IPNS URLs or paths, e.g: `ipfs://...` or `/ipfs/...`

### Bug Fixes

* remove gateway url support ([#307](https://github.com/ipfs/helia-verified-fetch/issues/307)) ([c1b6fc3](https://github.com/ipfs/helia-verified-fetch/commit/c1b6fc3f2d35ad8f73cb4a8ce57e94373728bf0e))

### Trivial Changes

* update sibling version ([#302](https://github.com/ipfs/helia-verified-fetch/issues/302)) ([4e9f8e1](https://github.com/ipfs/helia-verified-fetch/commit/4e9f8e1c67e8ce558a059812172ac0a303b5b5a7))

## [@helia/verified-fetch-interop-v3.0.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-2.0.2...@helia/verified-fetch-interop-3.0.0) (2025-12-15)

### ⚠ BREAKING CHANGES

* support for the `format` query arg has been removed, pass an accept header instead

### Bug Fixes

* remove gateway code ([#299](https://github.com/ipfs/helia-verified-fetch/issues/299)) ([9d2d7c2](https://github.com/ipfs/helia-verified-fetch/commit/9d2d7c279822776af0594570122d7f411ee01859))

### Dependencies

* bump kubo in the kubo-deps group across 1 directory ([#298](https://github.com/ipfs/helia-verified-fetch/issues/298)) ([4b7e7e0](https://github.com/ipfs/helia-verified-fetch/commit/4b7e7e085e12c2ddf24853aa5f3eb048a91e1fff))

## [@helia/verified-fetch-interop-v2.0.2](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-2.0.1...@helia/verified-fetch-interop-2.0.2) (2025-11-20)

### Dependencies

* bump glob from 11.1.0 to 13.0.0 ([#292](https://github.com/ipfs/helia-verified-fetch/issues/292)) ([0cd5330](https://github.com/ipfs/helia-verified-fetch/commit/0cd533029ce1f3a17b8730050273ae55da873536))

## [@helia/verified-fetch-interop-v2.0.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-2.0.0...@helia/verified-fetch-interop-2.0.1) (2025-11-20)

### Trivial Changes

* update sibling deps ([5e8ff1f](https://github.com/ipfs/helia-verified-fetch/commit/5e8ff1f7d3d8d41f91fa9a13354db9bc8c651ea9))

### Dependencies

* bump glob from 11.1.0 to 12.0.0 ([#287](https://github.com/ipfs/helia-verified-fetch/issues/287)) ([b28092e](https://github.com/ipfs/helia-verified-fetch/commit/b28092eed511ffe86c98fdba9af32c59aa751e1d))

## [@helia/verified-fetch-interop-v2.0.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.26.3...@helia/verified-fetch-interop-2.0.0) (2025-10-20)

### ⚠ BREAKING CHANGES

* upgrade helia to v6 and libp2p to v3 (#278)

### Dependencies

* upgrade helia to v6 and libp2p to v3 ([#278](https://github.com/ipfs/helia-verified-fetch/issues/278)) ([c9a8325](https://github.com/ipfs/helia-verified-fetch/commit/c9a8325efecea50625b6f0ec01370e194c8f0fc7))

## [@helia/verified-fetch-interop-v1.26.3](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.26.2...@helia/verified-fetch-interop-1.26.3) (2025-09-12)

### Tests

* conformance testing more modular, no hangs ([#266](https://github.com/ipfs/helia-verified-fetch/issues/266)) ([ae6e463](https://github.com/ipfs/helia-verified-fetch/commit/ae6e4631c4569dde88ce77f90fb05b05fdc82630))

## [@helia/verified-fetch-interop-v1.26.2](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.26.1...@helia/verified-fetch-interop-1.26.2) (2025-05-23)

### Bug Fixes

* handle aborted requests properly ([#241](https://github.com/ipfs/helia-verified-fetch/issues/241)) ([af4b426](https://github.com/ipfs/helia-verified-fetch/commit/af4b4261b3660f71e5831b9d5ed5e73f5aaebeac))

## [@helia/verified-fetch-interop-v1.26.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.26.0...@helia/verified-fetch-interop-1.26.1) (2025-05-21)

### Trivial Changes

* update version ([d32c104](https://github.com/ipfs/helia-verified-fetch/commit/d32c104f9df4666c7d409c45d9c13e3e34a10cd3))

### Dependencies

* bump aegir from 46.0.5 to 47.0.6 ([#236](https://github.com/ipfs/helia-verified-fetch/issues/236)) ([bc3d557](https://github.com/ipfs/helia-verified-fetch/commit/bc3d5574ee6f19a194f9498652b2e354d38020d4))

## [@helia/verified-fetch-interop-v1.26.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.25.0...@helia/verified-fetch-interop-1.26.0) (2025-05-14)

### Features

* support p2p retrieval by default ([#130](https://github.com/ipfs/helia-verified-fetch/issues/130)) ([9d33f89](https://github.com/ipfs/helia-verified-fetch/commit/9d33f8996f555fdee73ad3b0b129560c4d5b6cb6))

### Bug Fixes

* correct all typos and add spell checker ([5db3eec](https://github.com/ipfs/helia-verified-fetch/commit/5db3eec25db10fc4b8d1ec58e2754eb5cf9e61d6))
* ending path is not assumed to be filename ([#229](https://github.com/ipfs/helia-verified-fetch/issues/229)) ([6d24813](https://github.com/ipfs/helia-verified-fetch/commit/6d2481392c312de3a4ff2aee5ca6b686d31541ba)), closes [#228](https://github.com/ipfs/helia-verified-fetch/issues/228)
* ipns.resolve doesn't error in browsers ([#210](https://github.com/ipfs/helia-verified-fetch/issues/210)) ([abe2e5c](https://github.com/ipfs/helia-verified-fetch/commit/abe2e5ca4337ba11ace33620dc7cf963b94dd741))
* update readmes and bundle sizes ([cb920a5](https://github.com/ipfs/helia-verified-fetch/commit/cb920a57f347cff8e249671660c1fb522f89c8fa))

### Dependencies

* bump aegir from 42.2.11 to 44.1.4 ([#108](https://github.com/ipfs/helia-verified-fetch/issues/108)) ([e36fbff](https://github.com/ipfs/helia-verified-fetch/commit/e36fbffebee6af272b8fbf5cdcbbe1a46ea6b5c5))
* bump aegir from 44.1.4 to 45.0.1 ([#127](https://github.com/ipfs/helia-verified-fetch/issues/127)) ([53299e0](https://github.com/ipfs/helia-verified-fetch/commit/53299e0d39256e4c8aff22bb4999b1ed36e686ad))
* bump kubo from 0.28.0 to 0.32.0 ([#133](https://github.com/ipfs/helia-verified-fetch/issues/133)) ([f9606e0](https://github.com/ipfs/helia-verified-fetch/commit/f9606e0b1c2b614b4ceb4c748404e9174763df33))
* bump the helia-deps group across 3 directories with 7 updates ([#141](https://github.com/ipfs/helia-verified-fetch/issues/141)) ([d867350](https://github.com/ipfs/helia-verified-fetch/commit/d8673505044e84cc69c36128dc2874f0713853ab))
* bump the kubo-deps group across 3 directories with 2 updates ([#152](https://github.com/ipfs/helia-verified-fetch/issues/152)) ([e20be62](https://github.com/ipfs/helia-verified-fetch/commit/e20be62a16aa81c4728d98f163f7c1de38a943e6))
* **dev:** bump aegir from 45.2.1 to 46.0.1 ([5825e4a](https://github.com/ipfs/helia-verified-fetch/commit/5825e4a43566f8c3fe059dbb9e952c4e1ce708a1))
* update all deps ([#218](https://github.com/ipfs/helia-verified-fetch/issues/218)) ([121f361](https://github.com/ipfs/helia-verified-fetch/commit/121f3612d4e960e366b897bff970fb4a05b80639))

## @helia/verified-fetch-interop [1.25.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.24.1...@helia/verified-fetch-interop-1.25.0) (2024-06-13)



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.5.0

## @helia/verified-fetch-interop [1.24.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.24.0...@helia/verified-fetch-interop-1.24.1) (2024-05-24)


### Bug Fixes

* gateway conformance improvements ([#85](https://github.com/ipfs/helia-verified-fetch/issues/85)) ([7281078](https://github.com/ipfs/helia-verified-fetch/commit/72810786d7d49f6cc0fbf308717d70cf0740cd4c))


### Dependencies

* bump kubo from 0.27.0 to 0.28.0 ([#54](https://github.com/ipfs/helia-verified-fetch/issues/54)) ([3579844](https://github.com/ipfs/helia-verified-fetch/commit/3579844eeb90361ebdf9f97c10cbdc9c73c7c25f))



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.4.3

## @helia/verified-fetch-interop [1.24.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.23.0...@helia/verified-fetch-interop-1.24.0) (2024-05-16)



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.4.2

## @helia/verified-fetch-interop [1.23.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.22.0...@helia/verified-fetch-interop-1.23.0) (2024-05-09)



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.4.1

## @helia/verified-fetch-interop [1.22.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.21.1...@helia/verified-fetch-interop-1.22.0) (2024-05-09)


### Features

* use blockstore sessions ([#50](https://github.com/ipfs/helia-verified-fetch/issues/50)) ([541dd64](https://github.com/ipfs/helia-verified-fetch/commit/541dd646b0e83b9c69ed32d7a29e964144ad03cf))



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.4.0

## @helia/verified-fetch-interop [1.21.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.21.0...@helia/verified-fetch-interop-1.21.1) (2024-05-08)


### Bug Fixes

* prevent interop timeouts with fast fixture loading ([#73](https://github.com/ipfs/helia-verified-fetch/issues/73)) ([a43d994](https://github.com/ipfs/helia-verified-fetch/commit/a43d9940cf56d36e4d348246730b144a59e2cc8a))

## @helia/verified-fetch-interop [1.21.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.20.0...@helia/verified-fetch-interop-1.21.0) (2024-05-02)



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.3.14

## @helia/verified-fetch-interop [1.20.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.19.0...@helia/verified-fetch-interop-1.20.0) (2024-04-20)



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.3.13

## @helia/verified-fetch-interop [1.19.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.18.0...@helia/verified-fetch-interop-1.19.0) (2024-04-15)



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.3.12

## @helia/verified-fetch-interop [1.18.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.17.0...@helia/verified-fetch-interop-1.18.0) (2024-04-15)



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.3.11

## @helia/verified-fetch-interop [1.17.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.16.0...@helia/verified-fetch-interop-1.17.0) (2024-04-12)



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.3.10

## @helia/verified-fetch-interop [1.16.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.15.1...@helia/verified-fetch-interop-1.16.0) (2024-04-11)



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.3.9

## @helia/verified-fetch-interop [1.15.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.15.0...@helia/verified-fetch-interop-1.15.1) (2024-04-09)


### Dependencies

* updating all deps ([#47](https://github.com/ipfs/helia-verified-fetch/issues/47)) ([6d0ffd8](https://github.com/ipfs/helia-verified-fetch/commit/6d0ffd837e15f1d5bb84a5b2c855d490301ac312))



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.3.8

## @helia/verified-fetch-interop [1.15.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.14.0...@helia/verified-fetch-interop-1.15.0) (2024-04-08)



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.3.7

## @helia/verified-fetch-interop [1.14.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.13.0...@helia/verified-fetch-interop-1.14.0) (2024-04-08)



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.3.6

## @helia/verified-fetch-interop [1.13.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.12.0...@helia/verified-fetch-interop-1.13.0) (2024-04-08)



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.3.5

## @helia/verified-fetch-interop [1.12.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.11.0...@helia/verified-fetch-interop-1.12.0) (2024-04-02)



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.3.4

## @helia/verified-fetch-interop [1.11.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.10.1...@helia/verified-fetch-interop-1.11.0) (2024-03-28)



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.3.3

## @helia/verified-fetch-interop [1.10.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.10.0...@helia/verified-fetch-interop-1.10.1) (2024-03-25)


### Bug Fixes

* unixfs dir redirect ([#33](https://github.com/ipfs/helia-verified-fetch/issues/33)) ([32ca87f](https://github.com/ipfs/helia-verified-fetch/commit/32ca87f74840410a435412da64c8e22208fa2ec2))



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.3.2

## @helia/verified-fetch-interop [1.10.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.9.0...@helia/verified-fetch-interop-1.10.0) (2024-03-22)



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.3.1

## @helia/verified-fetch-interop [1.9.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.8.0...@helia/verified-fetch-interop-1.9.0) (2024-03-21)



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.3.0

## @helia/verified-fetch-interop [1.8.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.7.0...@helia/verified-fetch-interop-1.8.0) (2024-03-18)



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.2.1

## @helia/verified-fetch-interop [1.7.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.6.0...@helia/verified-fetch-interop-1.7.0) (2024-03-15)



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.2.0

## @helia/verified-fetch-interop [1.6.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.5.1...@helia/verified-fetch-interop-1.6.0) (2024-03-14)



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.1.3

## @helia/verified-fetch-interop [1.5.1](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.5.0...@helia/verified-fetch-interop-1.5.1) (2024-03-12)


### Dependencies

* bump kubo from 0.26.0 to 0.27.0 ([#12](https://github.com/ipfs/helia-verified-fetch/issues/12)) ([92cad49](https://github.com/ipfs/helia-verified-fetch/commit/92cad49de60a34cad031a07ee89f5c046004982f))

## @helia/verified-fetch-interop [1.5.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.4.0...@helia/verified-fetch-interop-1.5.0) (2024-03-11)



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.1.2

## @helia/verified-fetch-interop [1.4.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.3.0...@helia/verified-fetch-interop-1.4.0) (2024-03-08)



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.1.1

## @helia/verified-fetch-interop [1.3.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.2.0...@helia/verified-fetch-interop-1.3.0) (2024-03-03)



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.1.0

## @helia/verified-fetch-interop [1.2.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.1.0...@helia/verified-fetch-interop-1.2.0) (2024-02-29)



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.0.2

## @helia/verified-fetch-interop [1.1.0](https://github.com/ipfs/helia-verified-fetch/compare/@helia/verified-fetch-interop-1.0.0...@helia/verified-fetch-interop-1.1.0) (2024-02-29)



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.0.1

## @helia/verified-fetch-interop 1.0.0 (2024-02-28)


### Bug Fixes

* add interop tests and update project config ([fdc83b8](https://github.com/ipfs/helia-verified-fetch/commit/fdc83b8869066a961ae346f153e4b6b486091f01))



### Dependencies

* **@helia/verified-fetch:** upgraded to 1.0.0

# Changelog

## [5.0.0](https://github.com/ipfs/helia/compare/interop-v4.0.0...interop-v5.0.0) (2024-01-31)


### ⚠ BREAKING CHANGES

* to support paths in `@helia/ipns`, the return type of `ipns.resolve` is now `{ path: string, cid: CID }` instead of just `CID`

### Features

* support paths in @helia/ipns ([#410](https://github.com/ipfs/helia/issues/410)) ([ca8d5eb](https://github.com/ipfs/helia/commit/ca8d5ebdf587574c7fb84517b558226c3479caa9))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @helia/block-brokers bumped from ^2.0.0 to ^2.0.1
    * @helia/http bumped from ^1.0.0 to ^1.0.1
    * @helia/ipns bumped from ^5.0.0 to ^6.0.0
    * helia bumped from ^4.0.0 to ^4.0.1

## [4.0.0](https://github.com/ipfs/helia/compare/interop-v3.0.1...interop-v4.0.0) (2024-01-24)


### ⚠ BREAKING CHANGES

* remove gossipsub from default libp2p services ([#401](https://github.com/ipfs/helia/issues/401))
* `helia.routing` is the default routing used, the `libp2p` routing has been removed as it is redundant
* the `libp2p` property has been removed from the `Helia` interface in `@helia/interface` - it is still present on the return type of `createHelia` from the `helia` module

### Features

* add @helia/http to monorepo ([#372](https://github.com/ipfs/helia/issues/372)) ([76220cd](https://github.com/ipfs/helia/commit/76220cd5adf45af7fa61fd0a1321de4722b744d6))
* export binary from @helia/interop ([#384](https://github.com/ipfs/helia/issues/384)) ([3477b27](https://github.com/ipfs/helia/commit/3477b2748d44a862e8afeae1a7a2668cdd8a7100))
* use helia router for IPNS put/get ([#387](https://github.com/ipfs/helia/issues/387)) ([ce74026](https://github.com/ipfs/helia/commit/ce740268e83f50e6f144b74969a98d54005cd852))


### Bug Fixes

* include aegir config in interop and run from install dir ([#389](https://github.com/ipfs/helia/issues/389)) ([a2229bd](https://github.com/ipfs/helia/commit/a2229bd79d5c8b805604bb24bad222462a9ed8cc))
* remove gossipsub from default libp2p services ([#401](https://github.com/ipfs/helia/issues/401)) ([99c94f4](https://github.com/ipfs/helia/commit/99c94f4b85c4ed826a6195207e3545cbbc87a6d1))
* update ipns module to v9 and fix double verification of records ([#396](https://github.com/ipfs/helia/issues/396)) ([f2853f8](https://github.com/ipfs/helia/commit/f2853f8bd5bdcee8ab7a685355b0be47f29620e0))


### Dependencies

* bump kubo from 0.25.0 to 0.26.0 ([#400](https://github.com/ipfs/helia/issues/400)) ([a9c55f0](https://github.com/ipfs/helia/commit/a9c55f0e672e439cbcc6b938963ab150997c6e45))
* The following workspace dependencies were updated
  * dependencies
    * @helia/block-brokers bumped from ^1.0.0 to ^2.0.0
    * @helia/car bumped from ^2.0.1 to ^3.0.0
    * @helia/dag-cbor bumped from ^2.0.1 to ^3.0.0
    * @helia/dag-json bumped from ^2.0.1 to ^3.0.0
    * @helia/http bumped from ^0.9.0 to ^1.0.0
    * @helia/interface bumped from ^3.0.1 to ^4.0.0
    * @helia/ipns bumped from ^4.0.0 to ^5.0.0
    * @helia/json bumped from ^2.0.1 to ^3.0.0
    * @helia/mfs bumped from ^2.0.1 to ^3.0.0
    * @helia/routers bumped from ^0.0.0 to ^1.0.0
    * @helia/strings bumped from ^2.0.1 to ^3.0.0
    * @helia/unixfs bumped from ^2.0.1 to ^3.0.0
    * helia bumped from ^3.0.1 to ^4.0.0

## [3.0.1](https://github.com/ipfs/helia/compare/interop-v3.0.0...interop-v3.0.1) (2024-01-16)


### Bug Fixes

* update type import path ([#379](https://github.com/ipfs/helia/issues/379)) ([ece384a](https://github.com/ipfs/helia/commit/ece384aab5e1c95857aa4aa07b86656710d8ca35))

## [3.0.0](https://github.com/ipfs/helia/compare/interop-v2.0.0...interop-v3.0.0) (2024-01-09)


### ⚠ BREAKING CHANGES

* uses multiformats v13 and helia v3
* uses multiformats v13 and helia v3
* uses multiformats v13 and helia v3
* uses multiformats v13 and helia v3
* uses multiformats v13 and helia v3
* uses multiformats v13 and helia v3, renames `dht` routing to `libp2p`
* uses multiformats v13
* uses multiformats v13 and helia v3

### Features

* update helia to v3 and multiformats to v13 ([9f7dc0a](https://github.com/ipfs/helia/commit/9f7dc0a0581524531501fc062fefb6ba26d99c02))
* update helia to v3 and multiformats to v13 ([#147](https://github.com/ipfs/helia/issues/147)) ([001247c](https://github.com/ipfs/helia/commit/001247c6fc38ff3d810736371de901e5e1099f26))
* update helia to v3 and multiformats to v13 ([#167](https://github.com/ipfs/helia/issues/167)) ([a0381b9](https://github.com/ipfs/helia/commit/a0381b95051bbf3edfa4f53e0ae2d5f43c1e4382))
* update helia to v3 and multiformats to v13 ([#45](https://github.com/ipfs/helia/issues/45)) ([f078447](https://github.com/ipfs/helia/commit/f078447b6eba4c3d404d62bb930757aa1c0efe74))
* update helia to v3 and multiformats to v13 ([#45](https://github.com/ipfs/helia/issues/45)) ([3c7d9d4](https://github.com/ipfs/helia/commit/3c7d9d4a8e74e1a808c265fbc6ecbdc24f0f3da9))
* update helia to v3 and multiformats to v13 ([#46](https://github.com/ipfs/helia/issues/46)) ([e3dc586](https://github.com/ipfs/helia/commit/e3dc5867ffc4de0dd3b05b56eb1b0ce98d50dcb1))
* update helia to v3 and multiformats to v13 ([#52](https://github.com/ipfs/helia/issues/52)) ([6405c34](https://github.com/ipfs/helia/commit/6405c3487879614dc4dd7308b15c946d644e0488))
* update helia to v3 and multiformats to v13 ([#87](https://github.com/ipfs/helia/issues/87)) ([ae7cbc9](https://github.com/ipfs/helia/commit/ae7cbc9a16a267cb0f6d7cecd381f919430afaea))


### Bug Fixes

* create @helia/block-brokers package ([#341](https://github.com/ipfs/helia/issues/341)) ([#342](https://github.com/ipfs/helia/issues/342)) ([2979147](https://github.com/ipfs/helia/commit/297914756fa06dc0c28890a2654d1159d16689c2))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @helia/block-brokers bumped from ~0.0.0 to ~1.0.0
    * @helia/car bumped from ^2.0.0 to ^2.0.1
    * @helia/dag-cbor bumped from ^2.0.0 to ^2.0.1
    * @helia/dag-json bumped from ^2.0.0 to ^2.0.1
    * @helia/interface bumped from ^3.0.0 to ^3.0.1
    * @helia/json bumped from ^2.0.0 to ^2.0.1
    * @helia/mfs bumped from ^2.0.0 to ^2.0.1
    * @helia/strings bumped from ^2.0.0 to ^2.0.1
    * @helia/unixfs bumped from ^2.0.0 to ^2.0.1
    * helia bumped from ^3.0.0 to ^3.0.1

## [2.0.0](https://github.com/ipfs/helia/compare/interop-v1.1.0...interop-v2.0.0) (2024-01-07)


### ⚠ BREAKING CHANGES

* `helia.pin.add` and `helia.pin.rm` now return `AsyncGenerator<CID>`
* The libp2p API has changed in a couple of places - please see the [upgrade guide](https://github.com/libp2p/js-libp2p/blob/main/doc/migrations/v0.46-v1.0.0.md)

### deps

* updates to libp2p v1 ([#320](https://github.com/ipfs/helia/issues/320)) ([635d7a2](https://github.com/ipfs/helia/commit/635d7a2938111ccc53f8defbd9b8f8f8ea3e8e6a))


### Features

* iterable pinning ([#231](https://github.com/ipfs/helia/issues/231)) ([c15c774](https://github.com/ipfs/helia/commit/c15c7749294d3d4aea5aef70544d088250336798))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @helia/interface bumped from ^2.1.0 to ^3.0.0
    * helia bumped from ^2.1.0 to ^3.0.0

## [1.1.0](https://www.github.com/ipfs/helia/compare/interop-v1.0.3...interop-v1.1.0) (2023-11-06)


### Features

* GatewayBlockBroker prioritizes & tries all gateways ([#281](https://www.github.com/ipfs/helia/issues/281)) ([9bad21b](https://www.github.com/ipfs/helia/commit/9bad21bd59fe6d1ba4a137db5a46bd2ead5238c3))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @helia/interface bumped from ^2.0.0 to ^2.1.0
    * helia bumped from ^2.0.3 to ^2.1.0

### [1.0.3](https://www.github.com/ipfs/helia/compare/interop-v1.0.2...interop-v1.0.3) (2023-09-18)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * helia bumped from ^2.0.2 to ^2.0.3

### [1.0.2](https://www.github.com/ipfs/helia/compare/interop-v1.0.1...interop-v1.0.2) (2023-09-14)


### Bug Fixes

* **kubo:** ⬆️ Upgrading go-ipfs to kubo ([#251](https://www.github.com/ipfs/helia/issues/251)) ([963a7a2](https://www.github.com/ipfs/helia/commit/963a7a21774703a105c865a5b6db670f278eec73))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * helia bumped from ^2.0.1 to ^2.0.2

### [1.0.1](https://www.github.com/ipfs/helia/compare/interop-v1.0.0...interop-v1.0.1) (2023-08-16)


### Bug Fixes

* enable dcutr by default ([#239](https://www.github.com/ipfs/helia/issues/239)) ([7431f09](https://www.github.com/ipfs/helia/commit/7431f09aef332dc142a5f7c2c59c9410e4529a92))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * helia bumped from ^2.0.0 to ^2.0.1

## [1.0.0](https://www.github.com/ipfs/helia/compare/interop-v0.0.0...interop-v1.0.0) (2023-08-16)


### ⚠ BREAKING CHANGES

* libp2p has been updated to 0.46.x

### Dependencies

* **dev:** bump go-ipfs from 0.21.0 to 0.22.0 ([#228](https://www.github.com/ipfs/helia/issues/228)) ([2e8e447](https://www.github.com/ipfs/helia/commit/2e8e447f782745e517e935cd1bb3312db6384a5b))
* update libp2p to 0.46.x ([#215](https://www.github.com/ipfs/helia/issues/215)) ([65b68f0](https://www.github.com/ipfs/helia/commit/65b68f071d04d2f6f0fcf35938b146706b1a3cd0))



### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @helia/interface bumped from ^1.0.0 to ^2.0.0
    * helia bumped from ^1.0.0 to ^2.0.0
