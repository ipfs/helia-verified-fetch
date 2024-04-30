/**
 * @packageDocumentation
 *
 * Runs Gateway Conformance tests against @helia/verified-fetch using Kubo as a backing trustless-gateway.
 *
 * @example Debugging a test run
 *
 * ```console
 * $ DEBUG="-mocha*,*,*:trace" npm run test
 * ```
 *
 * @example Testing a new @helia/verified-fetch release
 *
 * ```console
 * $ npm i @helia/verified-fetch-gateway-conformance
 * $ VERIFIED_FETCH=@helia/verified-fetch@1.x.x-6f8c15b verified-fetch-gateway-conformance
 * ```
 *
 * @example Testing with a different Kubo version
 *
 * ```console
 * $ npm i @helia/verified-fetch-gateway-conformance
 * $ KUBO_BINARY=/path/to/kubo verified-fetch-gateway-conformance
 * ```
 */

export {}
