/**
 * @packageDocumentation
 *
 * Runs Gateway Conformance tests against @helia/verified-fetch using Kubo as a backing trustless-gateway.
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
 *
 * @example using a different gateway-conformance image
 *
 * ```console
 * $ GWC_IMAGE=ghcr.io/ipfs/gateway-conformance:v0.5.1 verified-fetch-gateway-conformance
 * ```
 *
 * @example Debugging a test run
 *
 * ```console
 * $ DEBUG="-mocha*,*,*:trace" npm run test # very verbose output
 * $ DEBUG="conformance-tests*,conformance-tests*:trace" npm run test # only gateway-conformance test output
 * ```
 *
 * @example querying the gateway-conformance server directly
 *
 * ```console
 * $ npm run build
 * $ node dist/src/demo-server.js # in terminal 1
 * $ curl -v GET http://localhost:3442/ipfs/bafkqabtimvwgy3yk/  # in terminal 2
 * ```
 *
 * # Troubleshooting
 *
 * ## Missing file in gateway-conformance-fixtures folder
 *
 * If you see the following error:
 * > ENOENT: no such file or directory, open '[...]/helia-verified-fetch/packages/gateway-conformance/dist/src/...
 *
 * This likely means the docker container is not executing properly for some reason. You can try running the following command to see if there are any errors: `DEBUG="-mocha*,*,*:trace" npm run test`
 */

export {}
