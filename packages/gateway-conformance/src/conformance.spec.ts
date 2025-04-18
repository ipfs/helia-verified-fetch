/* eslint-env mocha */
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { prefixLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { execa } from 'execa'
import { Agent, setGlobalDispatcher } from 'undici'
import { GWC_IMAGE } from './constants.js'

const logger = prefixLogger('gateway-conformance')

interface TestConfig {
  name: string
  spec?: string
  skip?: string[]
  run?: string[]
  expectPassing?: string[]
  expectFailing?: string[]
  successRate?: number
  timeout?: number
}

function getGatewayConformanceBinaryPath (): string {
  if (process.env.GATEWAY_CONFORMANCE_BINARY != null) {
    return process.env.GATEWAY_CONFORMANCE_BINARY
  }
  const goPath = process.env.GOPATH ?? join(homedir(), 'go')
  return join(goPath, 'bin', 'gateway-conformance')
}

function getConformanceTestArgs (name: string, gwcArgs: string[] = [], goTestArgs: string[] = []): string[] {
  return [
    'test',
    `--gateway-url=http://127.0.0.1:${process.env.SERVER_PORT}`,
    `--subdomain-url=http://${process.env.CONFORMANCE_HOST}:${process.env.SERVER_PORT}`,
    '--verbose',
    '--json', `gwc-report-${name}.json`,
    ...gwcArgs,
    '--',
    '-timeout', '5m',
    ...goTestArgs
  ]
}

/**
 * You can see what the latest success rates are by running the following command:
 *
 * ```
 * cd ../../ && npm run build && cd packages/gateway-conformance && SUCCESS_RATE=100 npm run test -- --bail false
 * ```
 */
const tests: TestConfig[] = [
  {
    name: 'TestMetadata',
    run: ['TestMetadata'],
    successRate: 100
  },
  {
    name: 'TestDagPbConversion',
    run: ['TestDagPbConversion'],
    successRate: 35.38,
    expectPassing: [
      'TestDagPbConversion/GET_UnixFS_file_as_DAG-JSON_with_format=dag-json_converts_to_the_expected_Content-Type/Status_code',
      'TestDagPbConversion/GET_UnixFS_file_as_DAG-JSON_with_format=dag-json_converts_to_the_expected_Content-Type/Header_Content-Type',
      'TestDagPbConversion/GET_UnixFS_file_as_DAG-JSON_with_format=dag-json_converts_to_the_expected_Content-Type/Header_Content-Type#01',
      'TestDagPbConversion/GET_UnixFS_directory_as_DAG-JSON_with_format=dag-json_converts_to_the_expected_Content-Type/Status_code',
      'TestDagPbConversion/GET_UnixFS_directory_as_DAG-JSON_with_format=dag-json_converts_to_the_expected_Content-Type/Header_Content-Type',
      'TestDagPbConversion/GET_UnixFS_directory_as_DAG-JSON_with_format=dag-json_converts_to_the_expected_Content-Type/Header_Content-Type#01',
      'TestDagPbConversion/GET_UnixFS_as_DAG-JSON_with_%27Accept:_application%2Fvnd.ipld.dag-json%27_converts_to_the_expected_Content-Type/Status_code',
      'TestDagPbConversion/GET_UnixFS_as_DAG-JSON_with_%27Accept:_application%2Fvnd.ipld.dag-json%27_converts_to_the_expected_Content-Type/Header_Content-Type',
      'TestDagPbConversion/GET_UnixFS_as_DAG-JSON_with_%27Accept:_application%2Fvnd.ipld.dag-json%27_converts_to_the_expected_Content-Type/Header_Content-Type#01',
      'TestDagPbConversion/GET_UnixFS_as_DAG-JSON_with_%27Accept:_foo%2C_application%2Fvnd.ipld.dag-json%2Cbar%27_converts_to_the_expected_Content-Type/Status_code',
      'TestDagPbConversion/GET_UnixFS_as_DAG-JSON_with_%27Accept:_foo%2C_application%2Fvnd.ipld.dag-json%2Cbar%27_converts_to_the_expected_Content-Type/Header_Content-Type',
      'TestDagPbConversion/GET_UnixFS_as_DAG-JSON_with_%27Accept:_foo%2C_application%2Fvnd.ipld.dag-json%2Cbar%27_converts_to_the_expected_Content-Type',
      'TestDagPbConversion/GET_UnixFS_with_format=json_%28not_dag-json%29_is_no-op_%28no_conversion%29/Header_Content-Type#01',
      'TestDagPbConversion/GET_UnixFS_with_format=json_%28not_dag-json%29_is_no-op_%28no_conversion%29/Header_Content-Type#02',
      'TestDagPbConversion/GET_UnixFS_with_%27Accept:_application%2Fjson%27_%28not_dag-json%29_is_no-op_%28no_conversion%29/Header_Content-Type#01',
      'TestDagPbConversion/GET_UnixFS_with_%27Accept:_application%2Fjson%27_%28not_dag-json%29_is_no-op_%28no_conversion%29/Header_Content-Type#02',
      'TestDagPbConversion/GET_UnixFS_file_as_DAG-CBOR_with_format=dag-cbor_converts_to_the_expected_Content-Type/Header_Content-Type#01',
      'TestDagPbConversion/GET_UnixFS_directory_as_DAG-CBOR_with_format=dag-cbor_converts_to_the_expected_Content-Type/Header_Content-Type#01',
      'TestDagPbConversion/GET_UnixFS_as_DAG-CBOR_with_%27Accept:_application%2Fvnd.ipld.dag-cbor%27_converts_to_the_expected_Content-Type/Header_Content-Type#01',
      'TestDagPbConversion/GET_UnixFS_with_format=cbor_%28not_dag-cbor%29_is_no-op_%28no_conversion%29/Header_Content-Type#01',
      'TestDagPbConversion/GET_UnixFS_with_format=cbor_%28not_dag-cbor%29_is_no-op_%28no_conversion%29/Header_Content-Type#02',
      'TestDagPbConversion/GET_UnixFS_with_%27Accept:_application%2Fcbor%27_%28not_dag-cbor%29_is_no-op_%28no_conversion%29/Header_Content-Type#01',
      'TestDagPbConversion/GET_UnixFS_with_%27Accept:_application%2Fcbor%27_%28not_dag-cbor%29_is_no-op_%28no_conversion%29/Header_Content-Type#02'
    ]
  },
  {
    name: 'TestPlainCodec',
    run: ['TestPlainCodec'],
    // successRate: 39.86,
    successRate: 36.96,
    expectPassing: [
      'TestPlainCodec/GET_plain_JSON_codec_without_Accept_or_format=_has_expected_%22json%22_Content-Type_and_body_as-is_-_full_request/Check_1/Status_code',
      'TestPlainCodec/GET_plain_JSON_codec_without_Accept_or_format=_has_expected_%22json%22_Content-Type_and_body_as-is_-_full_request/Check_1/Body',
      'TestPlainCodec/GET_plain_JSON_codec_without_Accept_or_format=_has_expected_%22json%22_Content-Type_and_body_as-is_-_full_request/Check_1',
      'TestPlainCodec/GET_plain_JSON_codec_without_Accept_or_format=_has_expected_%22json%22_Content-Type_and_body_as-is_-_single_range/Check_1/Check_0',
      'TestPlainCodec/GET_plain_JSON_codec_without_Accept_or_format=_has_expected_%22json%22_Content-Type_and_body_as-is_-_single_range/Check_1/Check_1',
      'TestPlainCodec/GET_plain_JSON_codec_without_Accept_or_format=_has_expected_%22json%22_Content-Type_and_body_as-is_-_single_range/Check_1',
      'TestPlainCodec/GET_plain_JSON_codec_without_Accept_or_format=_has_expected_%22json%22_Content-Type_and_body_as-is_-_multi_range/Check_1/Check_0',
      'TestPlainCodec/GET_plain_JSON_codec_without_Accept_or_format=_has_expected_%22json%22_Content-Type_and_body_as-is_-_multi_range/Check_1/Check_1',
      'TestPlainCodec/GET_plain_JSON_codec_without_Accept_or_format=_has_expected_%22json%22_Content-Type_and_body_as-is_-_multi_range/Check_1/Check_2',
      // 'TestPlainCodec/GET_plain_JSON_codec_without_Accept_or_format=_has_expected_%22json%22_Content-Type_and_body_as-is_-_multi_range/Check_1',
      'TestPlainCodec/GET_plain_JSON_codec_with_%3Fformat=_has_expected_json_Content-Type_and_body_as-is_-_full_request/Check_1/Status_code',
      'TestPlainCodec/GET_plain_JSON_codec_with_%3Fformat=_has_expected_json_Content-Type_and_body_as-is_-_full_request/Check_1/Body',
      'TestPlainCodec/GET_plain_JSON_codec_with_%3Fformat=_has_expected_json_Content-Type_and_body_as-is_-_full_request/Check_1',
      'TestPlainCodec/GET_plain_JSON_codec_with_%3Fformat=_has_expected_json_Content-Type_and_body_as-is_-_single_range/Check_1/Check_0',
      'TestPlainCodec/GET_plain_JSON_codec_with_%3Fformat=_has_expected_json_Content-Type_and_body_as-is_-_single_range/Check_1/Check_1',
      'TestPlainCodec/GET_plain_JSON_codec_with_%3Fformat=_has_expected_json_Content-Type_and_body_as-is_-_single_range/Check_1',
      'TestPlainCodec/GET_plain_JSON_codec_with_%3Fformat=_has_expected_json_Content-Type_and_body_as-is_-_multi_range/Check_1/Check_0',
      'TestPlainCodec/GET_plain_JSON_codec_with_%3Fformat=_has_expected_json_Content-Type_and_body_as-is_-_multi_range/Check_1/Check_1',
      'TestPlainCodec/GET_plain_JSON_codec_with_%3Fformat=_has_expected_json_Content-Type_and_body_as-is_-_multi_range/Check_1/Check_2',
      // 'TestPlainCodec/GET_plain_JSON_codec_with_%3Fformat=_has_expected_json_Content-Type_and_body_as-is_-_multi_range/Check_1',
      'TestPlainCodec/GET_plain_JSON_codec_with_Accept_has_expected_json_Content-Type_and_body_as-is%2C_with_single_range_request_-_full_request/Check_1/Status_code',
      'TestPlainCodec/GET_plain_JSON_codec_with_Accept_has_expected_json_Content-Type_and_body_as-is%2C_with_single_range_request_-_full_request/Check_1/Body',
      'TestPlainCodec/GET_plain_JSON_codec_with_Accept_has_expected_json_Content-Type_and_body_as-is%2C_with_single_range_request_-_full_request/Check_1',
      'TestPlainCodec/GET_plain_JSON_codec_with_Accept_has_expected_json_Content-Type_and_body_as-is%2C_with_single_range_request_-_single_range/Check_1/Check_0',
      'TestPlainCodec/GET_plain_JSON_codec_with_Accept_has_expected_json_Content-Type_and_body_as-is%2C_with_single_range_request_-_single_range/Check_1/Check_1',
      'TestPlainCodec/GET_plain_JSON_codec_with_Accept_has_expected_json_Content-Type_and_body_as-is%2C_with_single_range_request_-_single_range/Check_1',
      'TestPlainCodec/GET_plain_JSON_codec_with_Accept_has_expected_json_Content-Type_and_body_as-is%2C_with_single_range_request_-_multi_range/Check_1/Check_0',
      'TestPlainCodec/GET_plain_JSON_codec_with_Accept_has_expected_json_Content-Type_and_body_as-is%2C_with_single_range_request_-_multi_range/Check_1/Check_1',
      'TestPlainCodec/GET_plain_JSON_codec_with_Accept_has_expected_json_Content-Type_and_body_as-is%2C_with_single_range_request_-_multi_range/Check_1/Check_2',
      // 'TestPlainCodec/GET_plain_JSON_codec_with_Accept_has_expected_json_Content-Type_and_body_as-is%2C_with_single_range_request_-_multi_range/Check_1',
      'TestPlainCodec/GET_plain_JSON_codec_with_format=dag-json_interprets_json_as_dag-%2A_variant_and_produces_expected_Content-Type_and_body/Status_code',
      'TestPlainCodec/GET_plain_JSON_codec_with_format=dag-json_interprets_json_as_dag-%2A_variant_and_produces_expected_Content-Type_and_body/Header_Content-Type',
      'TestPlainCodec/GET_plain_JSON_codec_with_format=dag-json_interprets_json_as_dag-%2A_variant_and_produces_expected_Content-Type_and_body/Body',
      'TestPlainCodec/GET_plain_JSON_codec_with_format=dag-json_interprets_json_as_dag-%2A_variant_and_produces_expected_Content-Type_and_body%2C_with_single_range_request_-_single_range/Check_1/Check_0',
      'TestPlainCodec/GET_plain_JSON_codec_with_format=dag-json_interprets_json_as_dag-%2A_variant_and_produces_expected_Content-Type_and_body%2C_with_single_range_request_-_single_range/Check_1/Check_1',
      'TestPlainCodec/GET_plain_JSON_codec_with_format=dag-json_interprets_json_as_dag-%2A_variant_and_produces_expected_Content-Type_and_body%2C_with_single_range_request_-_single_range/Check_1',
      'TestPlainCodec/GET_plain_JSON_codec_with_format=dag-json_interprets_json_as_dag-%2A_variant_and_produces_expected_Content-Type_and_body%2C_with_single_range_request_-_multi_range/Check_1/Check_0',
      'TestPlainCodec/GET_plain_JSON_codec_with_format=dag-json_interprets_json_as_dag-%2A_variant_and_produces_expected_Content-Type_and_body%2C_with_single_range_request_-_multi_range/Check_1/Check_1',
      'TestPlainCodec/GET_plain_JSON_codec_with_format=dag-json_interprets_json_as_dag-%2A_variant_and_produces_expected_Content-Type_and_body%2C_with_single_range_request_-_multi_range/Check_1/Check_2',
      // 'TestPlainCodec/GET_plain_JSON_codec_with_format=dag-json_interprets_json_as_dag-%2A_variant_and_produces_expected_Content-Type_and_body%2C_with_single_range_request_-_multi_range/Check_1',
      'TestPlainCodec/GET_plain_CBOR_codec_without_Accept_or_format=_has_expected_%22cbor%22_Content-Type_and_body_as-is_-_single_range/Check_1/Check_0',
      'TestPlainCodec/GET_plain_CBOR_codec_without_Accept_or_format=_has_expected_%22cbor%22_Content-Type_and_body_as-is_-_single_range/Check_1/Check_1',
      'TestPlainCodec/GET_plain_CBOR_codec_without_Accept_or_format=_has_expected_%22cbor%22_Content-Type_and_body_as-is_-_multi_range/Check_1/Check_0',
      'TestPlainCodec/GET_plain_CBOR_codec_without_Accept_or_format=_has_expected_%22cbor%22_Content-Type_and_body_as-is_-_multi_range/Check_1/Check_1',
      'TestPlainCodec/GET_plain_CBOR_codec_without_Accept_or_format=_has_expected_%22cbor%22_Content-Type_and_body_as-is_-_multi_range/Check_1/Check_2',
      'TestPlainCodec/GET_plain_CBOR_codec_with_%3Fformat=_has_expected_cbor_Content-Type_and_body_as-is_-_single_range/Check_1/Check_0',
      'TestPlainCodec/GET_plain_CBOR_codec_with_%3Fformat=_has_expected_cbor_Content-Type_and_body_as-is_-_single_range/Check_1/Check_1',
      'TestPlainCodec/GET_plain_CBOR_codec_with_%3Fformat=_has_expected_cbor_Content-Type_and_body_as-is_-_multi_range/Check_1/Check_0',
      'TestPlainCodec/GET_plain_CBOR_codec_with_%3Fformat=_has_expected_cbor_Content-Type_and_body_as-is_-_multi_range/Check_1/Check_1',
      'TestPlainCodec/GET_plain_CBOR_codec_with_%3Fformat=_has_expected_cbor_Content-Type_and_body_as-is_-_multi_range/Check_1/Check_2',
      'TestPlainCodec/GET_plain_CBOR_codec_with_Accept_has_expected_cbor_Content-Type_and_body_as-is%2C_with_single_range_request_-_single_range/Check_1/Check_0',
      'TestPlainCodec/GET_plain_CBOR_codec_with_Accept_has_expected_cbor_Content-Type_and_body_as-is%2C_with_single_range_request_-_single_range/Check_1/Check_1',
      'TestPlainCodec/GET_plain_CBOR_codec_with_Accept_has_expected_cbor_Content-Type_and_body_as-is%2C_with_single_range_request_-_multi_range/Check_1/Check_0',
      'TestPlainCodec/GET_plain_CBOR_codec_with_Accept_has_expected_cbor_Content-Type_and_body_as-is%2C_with_single_range_request_-_multi_range/Check_1/Check_1',
      'TestPlainCodec/GET_plain_CBOR_codec_with_Accept_has_expected_cbor_Content-Type_and_body_as-is%2C_with_single_range_request_-_multi_range/Check_1/Check_2'
    ]
  },
  {
    name: 'TestPathing',
    run: ['TestPathing'],
    successRate: 40,
    expectPassing: [
      'TestPathing/GET_DAG-JSON_traverses_multiple_links/Status_code',
      'TestPathing/GET_DAG-CBOR_traverses_multiple_links/Status_code',
      'TestPathing/GET_DAG-CBOR_traverses_multiple_links/Body',
      'TestPathing/GET_DAG-CBOR_traverses_multiple_links',
      'TestPathing/GET_DAG-CBOR_returns_404_on_non-existing_link/Status_code',
      'TestPathing/GET_DAG-CBOR_returns_404_on_non-existing_link'
    ]
  },
  {
    name: 'TestDNSLinkGatewayUnixFSDirectoryListing',
    run: ['TestDNSLinkGatewayUnixFSDirectoryListing'],
    skip: [
      'TestDNSLinkGatewayUnixFSDirectoryListing/.*TODO:_cleanup_Kubo-specifics'
    ],
    successRate: 0
  },
  {
    name: 'TestCors',
    run: ['TestCors'],
    successRate: 0
  },
  {
    name: 'TestGatewayJsonCbor',
    run: ['TestGatewayJsonCbor'],
    successRate: 44.44,
    expectPassing: [
      'TestGatewayJsonCbor/GET_UnixFS_file_with_JSON_bytes_is_returned_with_application%2Fjson_Content-Type_-_without_headers/Status_code',
      'TestGatewayJsonCbor/GET_UnixFS_file_with_JSON_bytes_is_returned_with_application%2Fjson_Content-Type_-_without_headers/Body'
    ]
  },
  {
    name: 'TestNativeDag',
    run: ['TestNativeDag'],
    // successRate: 60.71,
    successRate: 58.93,
    expectPassing: [
      'TestNativeDag/GET_plain_JSON_codec_from_%2Fipfs_without_explicit_format_returns_the_same_payload_as_the_raw_block/Status_code',
      'TestNativeDag/GET_plain_JSON_codec_from_%2Fipfs_without_explicit_format_returns_the_same_payload_as_the_raw_block/Body',
      'TestNativeDag/GET_plain_JSON_codec_from_%2Fipfs_without_explicit_format_returns_the_same_payload_as_the_raw_block',
      'TestNativeDag/GET_plain_JSON_codec_from_%2Fipfs_with_format=dag-json_returns_the_same_payload_as_the_raw_block/Status_code',
      'TestNativeDag/GET_plain_JSON_codec_from_%2Fipfs_with_format=dag-json_returns_the_same_payload_as_the_raw_block/Body',
      'TestNativeDag/GET_plain_JSON_codec_from_%2Fipfs_with_format=dag-json_returns_the_same_payload_as_the_raw_block',
      'TestNativeDag/GET_plain_JSON_codec_from_%2Fipfs_with_application%2Fvnd.ipld.dag-json_returns_the_same_payload_as_the_raw_block/Status_code',
      'TestNativeDag/GET_plain_JSON_codec_from_%2Fipfs_with_application%2Fvnd.ipld.dag-json_returns_the_same_payload_as_the_raw_block/Body',
      'TestNativeDag/GET_plain_JSON_codec_from_%2Fipfs_with_application%2Fvnd.ipld.dag-json_returns_the_same_payload_as_the_raw_block',
      'TestNativeDag/GET_plain_JSON_codec_with_format=json_returns_same_payload_as_format=dag-json_but_with_plain_Content-Type/Status_code',
      'TestNativeDag/GET_plain_JSON_codec_with_format=json_returns_same_payload_as_format=dag-json_but_with_plain_Content-Type/Header_Content-Type',
      'TestNativeDag/GET_plain_JSON_codec_with_format=json_returns_same_payload_as_format=dag-json_but_with_plain_Content-Type/Body',
      'TestNativeDag/GET_plain_JSON_codec_with_format=json_returns_same_payload_as_format=dag-json_but_with_plain_Content-Type',
      'TestNativeDag/GET_plain_JSON_codec_with_Accept:_application%2Fjson_returns_same_payload_as_application%2Fvnd.ipld.dag-json_but_with_plain_Content-Type/Status_code',
      'TestNativeDag/GET_plain_JSON_codec_with_Accept:_application%2Fjson_returns_same_payload_as_application%2Fvnd.ipld.dag-json_but_with_plain_Content-Type/Header_Content-Type',
      'TestNativeDag/GET_plain_JSON_codec_with_Accept:_application%2Fjson_returns_same_payload_as_application%2Fvnd.ipld.dag-json_but_with_plain_Content-Type/Body',
      'TestNativeDag/GET_plain_JSON_codec_with_Accept:_application%2Fjson_returns_same_payload_as_application%2Fvnd.ipld.dag-json_but_with_plain_Content-Type',
      'TestNativeDag/GET_response_for_application%2Fvnd.ipld.dag-json_has_expected_Content-Type/Header_Content-Type',
      'TestNativeDag/GET_for_application%2Fvnd.ipld.dag-json_with_query_filename_includes_Content-Disposition_with_custom_filename/Header_Content-Disposition',
      'TestNativeDag/GET_for_application%2Fvnd.ipld.dag-json_with_query_filename_includes_Content-Disposition_with_custom_filename',
      'TestNativeDag/GET_for_application%2Fvnd.ipld.dag-json_with_%3Fdownload=true_forces_Content-Disposition:_attachment/Header_Content-Disposition',
      'TestNativeDag/GET_for_application%2Fvnd.ipld.dag-json_with_%3Fdownload=true_forces_Content-Disposition:_attachment',
      'TestNativeDag/Cache_control_HTTP_headers_%28json%29/Header_X-Ipfs-Path',
      'TestNativeDag/Cache_control_HTTP_headers_%28json%29/Header_Cache-Control',
      'TestNativeDag/HEAD_plain_JSON_codec_with_no_explicit_format_returns_HTTP_200/Status_code',
      'TestNativeDag/HEAD_plain_JSON_codec_with_an_explicit_DAG-JSON_format_returns_HTTP_200/Status_code',
      'TestNativeDag/GET_plain_JSON_codec_on_%2Fipfs_with_Accept:_text%2Fhtml_returns_HTML_%28dag-index-html%29/Header_Content-Disposition',
      'TestNativeDag/GET_plain_JSON_codec_on_%2Fipfs_with_Accept:_text%2Fhtml_returns_HTML_%28dag-index-html%29/Header_Cache-Control',
      'TestNativeDag/GET_plain_CBOR_codec_from_%2Fipfs_without_explicit_format_returns_the_same_payload_as_the_raw_block/Status_code',
      'TestNativeDag/GET_plain_CBOR_codec_from_%2Fipfs_without_explicit_format_returns_the_same_payload_as_the_raw_block/Body',
      'TestNativeDag/GET_plain_CBOR_codec_from_%2Fipfs_without_explicit_format_returns_the_same_payload_as_the_raw_block',
      'TestNativeDag/GET_plain_CBOR_codec_from_%2Fipfs_with_format=dag-cbor_returns_the_same_payload_as_the_raw_block/Status_code',
      'TestNativeDag/GET_plain_CBOR_codec_from_%2Fipfs_with_format=dag-cbor_returns_the_same_payload_as_the_raw_block/Body',
      'TestNativeDag/GET_plain_CBOR_codec_from_%2Fipfs_with_format=dag-cbor_returns_the_same_payload_as_the_raw_block',
      'TestNativeDag/GET_plain_CBOR_codec_from_%2Fipfs_with_application%2Fvnd.ipld.dag-cbor_returns_the_same_payload_as_the_raw_block/Status_code',
      'TestNativeDag/GET_plain_CBOR_codec_from_%2Fipfs_with_application%2Fvnd.ipld.dag-cbor_returns_the_same_payload_as_the_raw_block/Body',
      'TestNativeDag/GET_plain_CBOR_codec_from_%2Fipfs_with_application%2Fvnd.ipld.dag-cbor_returns_the_same_payload_as_the_raw_block',
      'TestNativeDag/GET_plain_CBOR_codec_with_format=cbor_returns_same_payload_as_format=dag-cbor_but_with_plain_Content-Type/Status_code',
      'TestNativeDag/GET_plain_CBOR_codec_with_format=cbor_returns_same_payload_as_format=dag-cbor_but_with_plain_Content-Type/Header_Content-Type',
      'TestNativeDag/GET_plain_CBOR_codec_with_format=cbor_returns_same_payload_as_format=dag-cbor_but_with_plain_Content-Type/Body',
      'TestNativeDag/GET_plain_CBOR_codec_with_format=cbor_returns_same_payload_as_format=dag-cbor_but_with_plain_Content-Type',
      'TestNativeDag/GET_plain_CBOR_codec_with_Accept:_application%2Fcbor_returns_same_payload_as_application%2Fvnd.ipld.dag-cbor_but_with_plain_Content-Type/Status_code',
      'TestNativeDag/GET_plain_CBOR_codec_with_Accept:_application%2Fcbor_returns_same_payload_as_application%2Fvnd.ipld.dag-cbor_but_with_plain_Content-Type/Header_Content-Type',
      'TestNativeDag/GET_plain_CBOR_codec_with_Accept:_application%2Fcbor_returns_same_payload_as_application%2Fvnd.ipld.dag-cbor_but_with_plain_Content-Type/Body',
      'TestNativeDag/GET_plain_CBOR_codec_with_Accept:_application%2Fcbor_returns_same_payload_as_application%2Fvnd.ipld.dag-cbor_but_with_plain_Content-Type',
      'TestNativeDag/GET_response_for_application%2Fvnd.ipld.dag-cbor_has_expected_Content-Type/Header_Content-Type',
      'TestNativeDag/GET_for_application%2Fvnd.ipld.dag-cbor_with_%3Fdownload=true_forces_Content-Disposition:_attachment/Header_Content-Disposition',
      'TestNativeDag/GET_for_application%2Fvnd.ipld.dag-cbor_with_%3Fdownload=true_forces_Content-Disposition:_attachment',
      'TestNativeDag/Cache_control_HTTP_headers_%28cbor%29/Header_X-Ipfs-Path',
      'TestNativeDag/Cache_control_HTTP_headers_%28cbor%29/Header_X-Ipfs-Roots',
      'TestNativeDag/Cache_control_HTTP_headers_%28cbor%29/Header_Cache-Control',
      'TestNativeDag/HEAD_plain_CBOR_codec_with_no_explicit_format_returns_HTTP_200/Status_code',
      'TestNativeDag/HEAD_plain_CBOR_codec_with_an_explicit_DAG-JSON_format_returns_HTTP_200/Status_code',
      'TestNativeDag/GET_plain_CBOR_codec_on_%2Fipfs_with_Accept:_text%2Fhtml_returns_HTML_%28dag-index-html%29/Header_Content-Disposition',
      'TestNativeDag/GET_plain_CBOR_codec_on_%2Fipfs_with_Accept:_text%2Fhtml_returns_HTML_%28dag-index-html%29/Header_Cache-Control',
      'TestNativeDag/Convert_application%2Fvnd.ipld.dag-cbor_to_application%2Fvnd.ipld.dag-json/Body',
      'TestNativeDag/Convert_application%2Fvnd.ipld.dag-cbor_to_application%2Fvnd.ipld.dag-json',
      'TestNativeDag/Convert_application%2Fvnd.ipld.dag-cbor_to_application%2Fvnd.ipld.dag-json_with_range_request_includes_correct_bytes_-_single_range/Check_0',
      'TestNativeDag/Convert_application%2Fvnd.ipld.dag-cbor_to_application%2Fvnd.ipld.dag-json_with_range_request_includes_correct_bytes_-_single_range/Check_1/Check_0',
      'TestNativeDag/Convert_application%2Fvnd.ipld.dag-cbor_to_application%2Fvnd.ipld.dag-json_with_range_request_includes_correct_bytes_-_single_range/Check_1/Check_1',
      'TestNativeDag/Convert_application%2Fvnd.ipld.dag-cbor_to_application%2Fvnd.ipld.dag-json_with_range_request_includes_correct_bytes_-_single_range/Check_1',
      'TestNativeDag/Convert_application%2Fvnd.ipld.dag-cbor_to_application%2Fvnd.ipld.dag-json_with_range_request_includes_correct_bytes_-_single_range',
      'TestNativeDag/Convert_application%2Fvnd.ipld.dag-cbor_to_application%2Fvnd.ipld.dag-json_with_range_request_includes_correct_bytes_-_multi_range/Check_0',
      'TestNativeDag/Convert_application%2Fvnd.ipld.dag-cbor_to_application%2Fvnd.ipld.dag-json_with_range_request_includes_correct_bytes_-_multi_range/Check_1/Check_0',
      'TestNativeDag/Convert_application%2Fvnd.ipld.dag-cbor_to_application%2Fvnd.ipld.dag-json_with_range_request_includes_correct_bytes_-_multi_range/Check_1/Check_1',
      'TestNativeDag/Convert_application%2Fvnd.ipld.dag-cbor_to_application%2Fvnd.ipld.dag-json_with_range_request_includes_correct_bytes_-_multi_range/Check_1/Check_2'
      // 'TestNativeDag/Convert_application%2Fvnd.ipld.dag-cbor_to_application%2Fvnd.ipld.dag-json_with_range_request_includes_correct_bytes_-_multi_range/Check_1',
      // 'TestNativeDag/Convert_application%2Fvnd.ipld.dag-cbor_to_application%2Fvnd.ipld.dag-json_with_range_request_includes_correct_bytes_-_multi_range'
    ]
  },
  {
    name: 'TestGatewayJSONCborAndIPNS',
    run: ['TestGatewayJSONCborAndIPNS'],
    successRate: 51.52,
    expectPassing: [
      'TestGatewayJSONCborAndIPNS/GET_plain_JSON_codec_from_%2Fipns_without_explicit_format_returns_the_same_payload_as_%2Fipfs',
      'TestGatewayJSONCborAndIPNS/GET_plain_JSON_codec_from_%2Fipns_with_explicit_format_returns_the_same_payload_as_%2Fipfs',
      'TestGatewayJSONCborAndIPNS/GET_plain_JSON_codec_from_%2Fipns_with_explicit_application%2Fvnd.ipld.dag-json_has_expected_headers/Header_Content-Type',
      'TestGatewayJSONCborAndIPNS/GET_plain_JSON_codec_from_%2Fipns_with_explicit_application%2Fvnd.ipld.dag-json_has_expected_headers/Header_X-Ipfs-Path',
      'TestGatewayJSONCborAndIPNS/GET_plain_JSON_codec_on_%2Fipns_with_Accept:_text%2Fhtml_returns_HTML_%28dag-index-html%29/Check_0/Header_Content-Disposition',
      'TestGatewayJSONCborAndIPNS/GET_plain_JSON_codec_on_%2Fipns_with_Accept:_text%2Fhtml_returns_HTML_%28dag-index-html%29/Check_1/Check_0',
      'TestGatewayJSONCborAndIPNS/GET_plain_JSON_codec_on_%2Fipns_with_Accept:_text%2Fhtml_returns_HTML_%28dag-index-html%29/Check_1/Check_1',
      'TestGatewayJSONCborAndIPNS/GET_plain_JSON_codec_on_%2Fipns_with_Accept:_text%2Fhtml_returns_HTML_%28dag-index-html%29/Check_1',
      'TestGatewayJSONCborAndIPNS/GET_plain_CBOR_codec_from_%2Fipns_without_explicit_format_returns_the_same_payload_as_%2Fipfs',
      'TestGatewayJSONCborAndIPNS/GET_plain_CBOR_codec_from_%2Fipns_with_explicit_format_returns_the_same_payload_as_%2Fipfs',
      'TestGatewayJSONCborAndIPNS/GET_plain_CBOR_codec_from_%2Fipns_with_explicit_application%2Fvnd.ipld.dag-cbor_has_expected_headers/Header_Content-Type',
      'TestGatewayJSONCborAndIPNS/GET_plain_CBOR_codec_from_%2Fipns_with_explicit_application%2Fvnd.ipld.dag-cbor_has_expected_headers/Header_X-Ipfs-Path',
      'TestGatewayJSONCborAndIPNS/GET_plain_CBOR_codec_from_%2Fipns_with_explicit_application%2Fvnd.ipld.dag-cbor_has_expected_headers/Header_X-Ipfs-Roots',
      'TestGatewayJSONCborAndIPNS/GET_plain_CBOR_codec_on_%2Fipns_with_Accept:_text%2Fhtml_returns_HTML_%28dag-index-html%29/Check_0/Header_Content-Disposition',
      'TestGatewayJSONCborAndIPNS/GET_plain_CBOR_codec_on_%2Fipns_with_Accept:_text%2Fhtml_returns_HTML_%28dag-index-html%29/Check_1/Check_0',
      'TestGatewayJSONCborAndIPNS/GET_plain_CBOR_codec_on_%2Fipns_with_Accept:_text%2Fhtml_returns_HTML_%28dag-index-html%29/Check_1/Check_1',
      'TestGatewayJSONCborAndIPNS/GET_plain_CBOR_codec_on_%2Fipns_with_Accept:_text%2Fhtml_returns_HTML_%28dag-index-html%29/Check_1'
    ]
  },
  {
    name: 'TestGatewayIPNSPath',
    run: ['TestGatewayIPNSPath'],
    successRate: 100,
    expectPassing: [
      'TestGatewayIPNSPath/GET_for_%2Fipns%2Fname_with_V1-only_signature_MUST_fail_with_5XX',
      'TestGatewayIPNSPath/GET_for_%2Fipns%2Fname_with_valid_V1+V2_signatures_with_V1-vs-V2_value_mismatch_MUST_fail_with_5XX',
      'TestGatewayIPNSPath/GET_for_%2Fipns%2Fname_with_valid_V2_and_broken_V1_signature_succeeds/Status_code',
      'TestGatewayIPNSPath/GET_for_%2Fipns%2Fname_with_valid_V2_and_broken_V1_signature_succeeds/Body',
      'TestGatewayIPNSPath/GET_for_%2Fipns%2Fname_with_valid_V2_and_broken_V1_signature_succeeds',
      'TestGatewayIPNSPath/GET_for_%2Fipns%2Fname_with_valid_V1+V2_signatures_succeeds/Body',
      'TestGatewayIPNSPath/GET_for_%2Fipns%2Fname_with_valid_V1+V2_signatures_succeeds',
      'TestGatewayIPNSPath/GET_for_%2Fipns%2Fname_with_valid_V2-only_signature_succeeds/Body',
      'TestGatewayIPNSPath/GET_for_%2Fipns%2Fname_with_valid_V2-only_signature_succeeds',
      'TestGatewayIPNSPath/GET_for_%2Fipns%2Fname_with_valid_V1_and_broken_V2_signature_MUST_fail_with_5XX',
      'TestGatewayIPNSPath'
    ]
  },
  {
    name: 'TestRedirectCanonicalIPNS',
    run: ['TestRedirectCanonicalIPNS'],
    successRate: 0
  },
  {
    name: 'TestGatewayBlock',
    run: ['TestGatewayBlock'],
    successRate: 75.86,
    expectPassing: [
      'TestGatewayBlock/GET_with_format=raw_param_returns_a_raw_block/Status_code',
      'TestGatewayBlock/GET_with_format=raw_param_returns_a_raw_block/Body',
      'TestGatewayBlock/GET_with_format=raw_param_returns_a_raw_block',
      'TestGatewayBlock/GET_with_application%2Fvnd.ipld.raw_header_returns_a_raw_block/Status_code',
      'TestGatewayBlock/GET_with_application%2Fvnd.ipld.raw_header_returns_a_raw_block/Body',
      'TestGatewayBlock/GET_with_application%2Fvnd.ipld.raw_header_returns_a_raw_block',
      'TestGatewayBlock/GET_with_application%2Fvnd.ipld.raw_with_single_range_request_includes_correct_bytes/Status_code',
      'TestGatewayBlock/GET_with_application%2Fvnd.ipld.raw_with_single_range_request_includes_correct_bytes/Header_Content-Range',
      'TestGatewayBlock/GET_with_application%2Fvnd.ipld.raw_with_single_range_request_includes_correct_bytes/Body',
      'TestGatewayBlock/GET_with_application%2Fvnd.ipld.raw_header_returns_expected_response_headers/Status_code',
      'TestGatewayBlock/GET_with_application%2Fvnd.ipld.raw_header_returns_expected_response_headers/Header_Content-Disposition',
      'TestGatewayBlock/GET_with_application%2Fvnd.ipld.raw_header_returns_expected_response_headers/Body',
      'TestGatewayBlock/GET_with_application%2Fvnd.ipld.raw_header_and_filename_param_returns_expected_Content-Disposition_header_with_custom_filename/Status_code',
      'TestGatewayBlock/GET_with_application%2Fvnd.ipld.raw_header_and_filename_param_returns_expected_Content-Disposition_header_with_custom_filename/Header_Content-Disposition',
      'TestGatewayBlock/GET_with_application%2Fvnd.ipld.raw_header_and_filename_param_returns_expected_Content-Disposition_header_with_custom_filename/Header_Content-Disposition#01',
      'TestGatewayBlock/GET_with_application%2Fvnd.ipld.raw_header_and_filename_param_returns_expected_Content-Disposition_header_with_custom_filename',
      'TestGatewayBlock/GET_with_application%2Fvnd.ipld.raw_header_returns_expected_caching_headers/Status_code',
      'TestGatewayBlock/GET_with_application%2Fvnd.ipld.raw_header_returns_expected_caching_headers/Header_ETag',
      'TestGatewayBlock/GET_with_application%2Fvnd.ipld.raw_header_returns_expected_caching_headers/Header_X-IPFS-Path',
      'TestGatewayBlock/GET_with_application%2Fvnd.ipld.raw_header_returns_expected_caching_headers/Header_Cache-Control'
    ]
  },
  {
    name: 'TestTrustlessRawRanges',
    run: ['TestTrustlessRawRanges'],
    successRate: 75,
    expectPassing: [
      'TestTrustlessRawRanges/GET_with_application%2Fvnd.ipld.raw_with_range_request_includes_correct_bytes_-_single_range/Check_0',
      'TestTrustlessRawRanges/GET_with_application%2Fvnd.ipld.raw_with_range_request_includes_correct_bytes_-_single_range/Check_1/Check_0',
      'TestTrustlessRawRanges/GET_with_application%2Fvnd.ipld.raw_with_range_request_includes_correct_bytes_-_single_range/Check_1/Check_1',
      'TestTrustlessRawRanges/GET_with_application%2Fvnd.ipld.raw_with_range_request_includes_correct_bytes_-_single_range/Check_1',
      'TestTrustlessRawRanges/GET_with_application%2Fvnd.ipld.raw_with_range_request_includes_correct_bytes_-_single_range',
      'TestTrustlessRawRanges/GET_with_application%2Fvnd.ipld.raw_with_range_request_includes_correct_bytes_-_multi_range/Check_0',
      'TestTrustlessRawRanges/GET_with_application%2Fvnd.ipld.raw_with_range_request_includes_correct_bytes_-_multi_range/Check_1/Check_0',
      'TestTrustlessRawRanges/GET_with_application%2Fvnd.ipld.raw_with_range_request_includes_correct_bytes_-_multi_range/Check_1/Check_1',
      'TestTrustlessRawRanges/GET_with_application%2Fvnd.ipld.raw_with_range_request_includes_correct_bytes_-_multi_range/Check_1/Check_2'
    ]
  },
  {
    name: 'TestTrustlessRaw',
    run: ['TestTrustlessRaw'],
    skip: ['TestTrustlessRawRanges'],
    successRate: 70.83,
    expectPassing: [
      'TestTrustlessRaw/GET_with_format=raw_param_returns_a_raw_block/Status_code',
      'TestTrustlessRaw/GET_with_format=raw_param_returns_a_raw_block/Body',
      'TestTrustlessRaw/GET_with_format=raw_param_returns_a_raw_block',
      'TestTrustlessRaw/GET_with_application%2Fvnd.ipld.raw_header_returns_a_raw_block/Status_code',
      'TestTrustlessRaw/GET_with_application%2Fvnd.ipld.raw_header_returns_a_raw_block/Body',
      'TestTrustlessRaw/GET_with_application%2Fvnd.ipld.raw_header_returns_a_raw_block',
      'TestTrustlessRaw/GET_with_application%2Fvnd.ipld.raw_header_returns_expected_response_headers/Status_code',
      'TestTrustlessRaw/GET_with_application%2Fvnd.ipld.raw_header_returns_expected_response_headers/Header_Content-Disposition',
      'TestTrustlessRaw/GET_with_application%2Fvnd.ipld.raw_header_returns_expected_response_headers/Body',
      'TestTrustlessRaw/GET_with_application%2Fvnd.ipld.raw_header_and_filename_param_returns_expected_Content-Disposition_header_with_custom_filename/Status_code',
      'TestTrustlessRaw/GET_with_application%2Fvnd.ipld.raw_header_and_filename_param_returns_expected_Content-Disposition_header_with_custom_filename/Header_Content-Disposition',
      'TestTrustlessRaw/GET_with_application%2Fvnd.ipld.raw_header_and_filename_param_returns_expected_Content-Disposition_header_with_custom_filename/Header_Content-Disposition#01',
      'TestTrustlessRaw/GET_with_application%2Fvnd.ipld.raw_header_and_filename_param_returns_expected_Content-Disposition_header_with_custom_filename',
      'TestTrustlessRaw/GET_with_application%2Fvnd.ipld.raw_header_returns_expected_caching_headers/Status_code',
      'TestTrustlessRaw/GET_with_application%2Fvnd.ipld.raw_header_returns_expected_caching_headers/Header_Etag',
      'TestTrustlessRaw/GET_with_application%2Fvnd.ipld.raw_header_returns_expected_caching_headers/Header_X-IPFS-Path',
      'TestTrustlessRaw/GET_with_application%2Fvnd.ipld.raw_header_returns_expected_caching_headers/Header_Cache-Control'
    ]
  },
  {
    name: 'TestGatewayIPNSRecord',
    run: ['TestGatewayIPNSRecord'],
    successRate: 52.17,
    expectPassing: [
      'TestGatewayIPNSRecord/GET_IPNS_Record_%28V1+V2%29_with_format=ipns-record_has_expected_HTTP_headers_and_valid_key/Header_Content-Type',
      'TestGatewayIPNSRecord/GET_IPNS_Record_%28V1+V2%29_with_format=ipns-record_has_expected_HTTP_headers_and_valid_key/Header_Cache-Control',
      'TestGatewayIPNSRecord/GET_IPNS_Record_%28V1+V2%29_with_format=ipns-record_has_expected_HTTP_headers_and_valid_key/Body',
      'TestGatewayIPNSRecord/GET_IPNS_Record_%28V2%29_with_format=ipns-record_has_expected_HTTP_headers_and_valid_key/Header_Content-Type',
      'TestGatewayIPNSRecord/GET_IPNS_Record_%28V2%29_with_format=ipns-record_has_expected_HTTP_headers_and_valid_key/Header_Cache-Control',
      'TestGatewayIPNSRecord/GET_IPNS_Record_%28V2%29_with_format=ipns-record_has_expected_HTTP_headers_and_valid_key/Body',
      'TestGatewayIPNSRecord/GET_IPNS_Record_%28V1+V2%29_with_%27Accept:_application%2Fvnd.ipfs.ipns-record%27_has_expected_HTTP_headers_and_valid_key/Header_Content-Type',
      'TestGatewayIPNSRecord/GET_IPNS_Record_%28V1+V2%29_with_%27Accept:_application%2Fvnd.ipfs.ipns-record%27_has_expected_HTTP_headers_and_valid_key/Header_Cache-Control',
      'TestGatewayIPNSRecord/GET_IPNS_Record_%28V1+V2%29_with_%27Accept:_application%2Fvnd.ipfs.ipns-record%27_has_expected_HTTP_headers_and_valid_key/Body',
      'TestGatewayIPNSRecord/GET_IPNS_Record_%28V2%29_with_%27Accept:_application%2Fvnd.ipfs.ipns-record%27_has_expected_HTTP_headers_and_valid_key/Header_Content-Type',
      'TestGatewayIPNSRecord/GET_IPNS_Record_%28V2%29_with_%27Accept:_application%2Fvnd.ipfs.ipns-record%27_has_expected_HTTP_headers_and_valid_key/Header_Cache-Control',
      'TestGatewayIPNSRecord/GET_IPNS_Record_%28V2%29_with_%27Accept:_application%2Fvnd.ipfs.ipns-record%27_has_expected_HTTP_headers_and_valid_key/Body'
    ]
  },
  {
    name: 'TestTrustlessCarOrderAndDuplicates',
    run: ['TestTrustlessCarOrderAndDuplicates'],
    // successRate: 44.83,
    successRate: 41.38,
    expectPassing: [
      'TestTrustlessCarOrderAndDuplicates/GET_CAR_with_order=dfs_and_dups=y_of_UnixFS_Directory_With_Duplicate_Files/Status_code',
      'TestTrustlessCarOrderAndDuplicates/GET_CAR_with_order=dfs_and_dups=y_of_UnixFS_Directory_With_Duplicate_Files/Header_Content-Type',
      'TestTrustlessCarOrderAndDuplicates/GET_CAR_with_order=dfs_and_dups=y_of_UnixFS_Directory_With_Duplicate_Files/Body',
      'TestTrustlessCarOrderAndDuplicates/GET_CAR_with_order=dfs_and_dups=n_of_UnixFS_Directory_With_Duplicate_Files/Status_code',
      'TestTrustlessCarOrderAndDuplicates/GET_CAR_with_order=dfs_and_dups=n_of_UnixFS_Directory_With_Duplicate_Files/Header_Content-Type',
      'TestTrustlessCarOrderAndDuplicates/GET_CAR_smoke-test_with_order=unk_of_UnixFS_Directory/Status_code',
      'TestTrustlessCarOrderAndDuplicates/GET_CAR_smoke-test_with_order=unk_of_UnixFS_Directory/Header_Content-Type',
      'TestTrustlessCarOrderAndDuplicates/GET_CAR_smoke-test_with_order=unk_of_UnixFS_Directory/Body',
      'TestTrustlessCarOrderAndDuplicates/GET_CAR_with_order=dfs_and_dups=y_of_identity_CID/Status_code',
      // 'TestTrustlessCarOrderAndDuplicates/GET_CAR_with_order=dfs_and_dups=y_of_identity_CID/Header_Content-Type',
      'TestTrustlessCarOrderAndDuplicates/GET_CAR_with_Accept_and_%3Fformat%2C_specific_Accept_header_is_prioritized/Status_code',
      'TestTrustlessCarOrderAndDuplicates/GET_CAR_with_Accept_and_%3Fformat%2C_specific_Accept_header_is_prioritized/Header_Content-Type',
      'TestTrustlessCarOrderAndDuplicates/GET_CAR_with_Accept_and_%3Fformat%2C_specific_Accept_header_is_prioritized/Body'
    ]
  },
  // {
  //   // currently timing out
  //   name: 'TestTrustlessCarEntityBytes',
  //   run: ['TestTrustlessCarEntityBytes'],
  //   successRate: 100
  // },
  {
    name: 'TestTrustlessCarDagScopeAll',
    run: ['TestTrustlessCarDagScopeAll'],
    successRate: 48.48,
    expectPassing: [
      'TestTrustlessCarDagScopeAll/GET_CAR_with_dag-scope=all_of_UnixFS_directory_with_multiple_files_%28format=car%29/Status_code',
      'TestTrustlessCarDagScopeAll/GET_CAR_with_dag-scope=all_of_UnixFS_directory_with_multiple_files_%28format=car%29/Header_Content-Type',
      'TestTrustlessCarDagScopeAll/GET_CAR_with_dag-scope=all_of_UnixFS_directory_with_multiple_files_%28format=car%29/Header_Content-Disposition',
      'TestTrustlessCarDagScopeAll/GET_CAR_with_dag-scope=all_of_UnixFS_directory_with_multiple_files_%28format=car%29/Header_Etag',
      // 'TestTrustlessCarDagScopeAll/GET_CAR_with_dag-scope=all_of_UnixFS_directory_with_multiple_files_%28format=car%29/Body',
      'TestTrustlessCarDagScopeAll/GET_CAR_with_dag-scope=all_of_UnixFS_directory_with_multiple_files_%28Accept_Header%29/Status_code',
      'TestTrustlessCarDagScopeAll/GET_CAR_with_dag-scope=all_of_UnixFS_directory_with_multiple_files_%28Accept_Header%29/Header_Content-Type',
      'TestTrustlessCarDagScopeAll/GET_CAR_with_dag-scope=all_of_UnixFS_directory_with_multiple_files_%28Accept_Header%29/Header_Content-Disposition',
      'TestTrustlessCarDagScopeAll/GET_CAR_with_dag-scope=all_of_UnixFS_directory_with_multiple_files_%28Accept_Header%29/Header_Etag',
      // 'TestTrustlessCarDagScopeAll/GET_CAR_with_dag-scope=all_of_UnixFS_directory_with_multiple_files_%28Accept_Header%29/Body',
      'TestTrustlessCarDagScopeAll/GET_CAR_with_dag-scope=all_of_a_chunked_UnixFS_file_%28format=car%29/Status_code',
      'TestTrustlessCarDagScopeAll/GET_CAR_with_dag-scope=all_of_a_chunked_UnixFS_file_%28format=car%29/Header_Content-Type',
      'TestTrustlessCarDagScopeAll/GET_CAR_with_dag-scope=all_of_a_chunked_UnixFS_file_%28format=car%29/Header_Content-Disposition',
      'TestTrustlessCarDagScopeAll/GET_CAR_with_dag-scope=all_of_a_chunked_UnixFS_file_%28format=car%29/Header_Etag',
      'TestTrustlessCarDagScopeAll/GET_CAR_with_dag-scope=all_of_a_chunked_UnixFS_file_%28Accept_Header%29/Status_code',
      'TestTrustlessCarDagScopeAll/GET_CAR_with_dag-scope=all_of_a_chunked_UnixFS_file_%28Accept_Header%29/Header_Content-Type',
      'TestTrustlessCarDagScopeAll/GET_CAR_with_dag-scope=all_of_a_chunked_UnixFS_file_%28Accept_Header%29/Header_Content-Disposition',
      'TestTrustlessCarDagScopeAll/GET_CAR_with_dag-scope=all_of_a_chunked_UnixFS_file_%28Accept_Header%29/Header_Etag'
    ]
  },
  // {
  //   // currently timing out
  //   name: 'TestTrustlessCarDagScopeEntity',
  //   run: ['TestTrustlessCarDagScopeEntity'],
  //   successRate: 34.57
  // },
  // {
  //   // currently timing out
  //   name: 'TestTrustlessCarDagScopeBlock',
  //   run: ['TestTrustlessCarDagScopeBlock'],
  //   successRate: 34.69
  // },
  // {
  //   // passes at the set successRate, but takes incredibly long (consistently ~2m).. disabling for now.
  //   name: 'TestTrustlessCarPathing',
  //   run: ['TestTrustlessCarPathing'],
  //   successRate: 35,
  //   timeout: 130000
  // },
  // {
  //   // currently timing out
  //   name: 'TestSubdomainGatewayDNSLinkInlining',
  //   run: ['TestSubdomainGatewayDNSLinkInlining'],
  //   successRate: 100
  // },
  {
    name: 'TestGatewaySubdomainAndIPNS',
    run: [
      'TestGatewaySubdomainAndIPNS'
    ],
    skip: [
      'TestGatewaySubdomainAndIPNS/request_for_a_ED25519_libp2p-key_.*',
      'TestGatewaySubdomainAndIPNS/.*redirects_to_CID_with_libp2p-key_multicodec',
      'TestGatewaySubdomainAndIPNS/.*redirects_to_CIDv1.*'
    ],
    successRate: 46.15,
    expectPassing: [
      'TestGatewaySubdomainAndIPNS/request_for_%2Fipns%2F%7BCIDv1%7D_redirects_to_same_CIDv1_on_subdomain#01/Status_code',
      'TestGatewaySubdomainAndIPNS/request_for_%2Fipns%2F%7BCIDv1%7D_redirects_to_same_CIDv1_on_subdomain#01/Header_Location',
      'TestGatewaySubdomainAndIPNS/request_for_%2Fipns%2F%7BCIDv1%7D_redirects_to_same_CIDv1_on_subdomain#01',
      'TestGatewaySubdomainAndIPNS/request_for_%7BCIDv1-base36-libp2p-key%7D.ipns.%7Bgateway%7D_returns_expected_payload#01/Status_code',
      'TestGatewaySubdomainAndIPNS/request_for_%7BCIDv1-base36-libp2p-key%7D.ipns.%7Bgateway%7D_returns_expected_payload#01/Body',
      'TestGatewaySubdomainAndIPNS/request_for_%7BCIDv1-base36-libp2p-key%7D.ipns.%7Bgateway%7D_returns_expected_payload#01'
    ]
  },
  {
    // TODO: add directory listing support to verified-fetch
    name: 'TestGatewaySubdomains',
    run: [
      'TestGatewaySubdomains'
    ],
    skip: [
      'TestGatewaySubdomains/.*HTTP_proxy_tunneling_via_CONNECT' // verified fetch should not be doing HTTP proxy tunneling.
    ],
    successRate: 49.18,
    expectPassing: [
      'TestGatewaySubdomains/request_for_example.com%2Fipfs%2F%7Bcid%7D_redirects_to_%7Bcid%7D.ipfs.example.com/Status_code',
      'TestGatewaySubdomains/request_for_example.com%2Fipfs%2F%7Bcid%7D_redirects_to_%7Bcid%7D.ipfs.example.com/Header_Location',
      'TestGatewaySubdomains/request_for_example.com%2Fipfs%2F%7Bcid%7D_redirects_to_%7Bcid%7D.ipfs.example.com',
      'TestGatewaySubdomains/request_for_example.com%2Fipfs%2F%7BCIDv1%7D%2F%7Bfilename_with_percent_encoding%7D_redirects_to_subdomain/Status_code',
      'TestGatewaySubdomains/request_for_example.com%2Fipfs%2F%7BCIDv1%7D%2F%7Bfilename_with_percent_encoding%7D_redirects_to_subdomain/Header_Location',
      'TestGatewaySubdomains/request_for_example.com%2Fipfs%2F%7BCIDv1%7D%2F%7Bfilename_with_percent_encoding%7D_redirects_to_subdomain',
      'TestGatewaySubdomains/request_for_example.com%2Fipfs%2F%7BDirCID%7D%2F_redirects_to_subdomain/Status_code',
      'TestGatewaySubdomains/request_for_example.com%2Fipfs%2F%7BDirCID%7D%2F_redirects_to_subdomain/Header_Location',
      'TestGatewaySubdomains/request_for_example.com%2Fipfs%2F%7BDirCID%7D%2F_redirects_to_subdomain',
      'TestGatewaySubdomains/request_for_example.com%2Fipfs%2F%7BCIDv0%7D_redirects_to_%7BCIDv1%7D.ipfs.example.com/Status_code',
      'TestGatewaySubdomains/request_for_example.com%2Fipfs%2F%7BCIDv0%7D_redirects_to_%7BCIDv1%7D.ipfs.example.com/Header_Location',
      'TestGatewaySubdomains/request_for_example.com%2Fipfs%2F%7BCIDv0%7D_redirects_to_%7BCIDv1%7D.ipfs.example.com',
      'TestGatewaySubdomains/request_for_%7BCID%7D.ipfs.example.com_should_return_expected_payload/Status_code',
      'TestGatewaySubdomains/request_for_%7BCID%7D.ipfs.example.com_should_return_expected_payload/Body',
      'TestGatewaySubdomains/request_for_%7BCID%7D.ipfs.example.com_should_return_expected_payload',
      'TestGatewaySubdomains/request_for_%7BCID%7D.ipfs.example.com%2Fipfs%2F%7BCID%7D_should_return_HTTP_404/Status_code',
      'TestGatewaySubdomains/request_for_%7BCID%7D.ipfs.example.com%2Fipfs%2F%7BCID%7D_should_return_HTTP_404',
      'TestGatewaySubdomains/request_for_%7BCID%7D.ipfs.example.com%2Fipfs%2Ffile.txt_should_return_data_from_a_file_in_CID_content_root/Status_code',
      'TestGatewaySubdomains/request_for_%7BCID%7D.ipfs.example.com%2Fipfs%2Ffile.txt_should_return_data_from_a_file_in_CID_content_root/Body',
      'TestGatewaySubdomains/request_for_%7BCID%7D.ipfs.example.com%2Fipfs%2Ffile.txt_should_return_data_from_a_file_in_CID_content_root',
      'TestGatewaySubdomains/request_for_deep_path_resource_at_%7Bcid%7D.ipfs.example.com%2Fsub%2Fdir%2Ffile/Status_code',
      'TestGatewaySubdomains/request_for_deep_path_resource_at_%7Bcid%7D.ipfs.example.com%2Fsub%2Fdir%2Ffile/Body',
      'TestGatewaySubdomains/request_for_deep_path_resource_at_%7Bcid%7D.ipfs.example.com%2Fsub%2Fdir%2Ffile',
      'TestGatewaySubdomains/request_for_example.com%2Fipfs%2F%7BCID%7D_with_X-Forwarded-Proto:_https_produces_redirect_to_HTTPS_URL/Status_code',
      'TestGatewaySubdomains/request_for_example.com%2Fipfs%2F%7BCID%7D_with_X-Forwarded-Proto:_http_produces_redirect_to_HTTP_URL/Status_code',
      'TestGatewaySubdomains/request_for_example.com%2Fipfs%2F%7BCID%7D_with_X-Forwarded-Proto:_http_produces_redirect_to_HTTP_URL/Header_Location',
      'TestGatewaySubdomains/request_for_example.com%2Fipfs%2F%7BCID%7D_with_X-Forwarded-Proto:_http_produces_redirect_to_HTTP_URL'
    ]
  },
  {
    name: 'TestUnixFSDirectoryListingOnSubdomainGateway',
    run: ['TestUnixFSDirectoryListingOnSubdomainGateway'],
    successRate: 33.33,
    expectPassing: [
      'TestUnixFSDirectoryListingOnSubdomainGateway/redirect_dir_listing_to_URL_with_trailing_slash/Status_code',
      'TestUnixFSDirectoryListingOnSubdomainGateway/backlink_on_root_CID_should_be_hidden_%28TODO:_cleanup_Kubo-specifics%29/Body',
      'TestUnixFSDirectoryListingOnSubdomainGateway/backlink_on_root_CID_should_be_hidden_%28TODO:_cleanup_Kubo-specifics%29'
    ]
  },
  {
    name: 'TestRedirectsFileWithIfNoneMatchHeader',
    run: ['TestRedirectsFileWithIfNoneMatchHeader'],
    successRate: 0
  },
  {
    name: 'TestRedirectsFileSupportWithDNSLink',
    run: ['TestRedirectsFileSupportWithDNSLink'],
    successRate: 27.27,
    expectPassing: [
      'TestRedirectsFileSupportWithDNSLink/request_for_%2F%2F%7Bdnslink%7D%2Fen%2Fhas-no-redirects-entry_returns_custom_404%2C_per__redirects_file/Header_Cache-Control',
      'TestRedirectsFileSupportWithDNSLink/request_for_%2F%2F%7Bdnslink%7D%2Fen%2Fhas-no-redirects-entry_returns_custom_404%2C_per__redirects_file/Header_Cache-Control#01',
      'TestRedirectsFileSupportWithDNSLink/request_for_%2F%2F%7Bdnslink%7D%2Fen%2Fhas-no-redirects-entry_returns_custom_404%2C_per__redirects_file/Header_Date'
    ]
  },
  {
    name: 'TestRedirectsFileSupport',
    run: ['TestRedirectsFileSupport'],
    skip: ['TestRedirectsFileSupportWithDNSLink'],
    successRate: 0
  },
  {
    name: 'TestPathGatewayMiscellaneous',
    run: ['TestPathGatewayMiscellaneous'],
    successRate: 100,
    expectPassing: [
      'TestPathGatewayMiscellaneous/GET_for_%2Fipfs%2F_file_whose_filename_contains_percentage-encoded_characters_works/Body',
      'TestPathGatewayMiscellaneous/GET_for_%2Fipfs%2F_file_whose_filename_contains_percentage-encoded_characters_works',
      'TestPathGatewayMiscellaneous'
    ]
  },
  {
    name: 'TestGatewayUnixFSFileRanges',
    run: ['TestGatewayUnixFSFileRanges'],
    successRate: 53.33,
    expectPassing: [
      'TestGatewayUnixFSFileRanges/GET_for_%2Fipfs%2F_file_with_single_range_request_includes_correct_bytes/Status_code',
      'TestGatewayUnixFSFileRanges/GET_for_%2Fipfs%2F_file_with_single_range_request_includes_correct_bytes/Header_Content-Type',
      'TestGatewayUnixFSFileRanges/GET_for_%2Fipfs%2F_file_with_multiple_range_request_includes_correct_bytes/Header_Content-Type',
      'TestGatewayUnixFSFileRanges/GET_for_%2Fipfs%2F_file_with_multiple_range_request_includes_correct_bytes/Header_Content-Range',
      'TestGatewayUnixFSFileRanges/GET_for_%2Fipfs%2F_file_with_multiple_range_request_includes_correct_bytes#01/Header_Content-Type',
      'TestGatewayUnixFSFileRanges/GET_for_%2Fipfs%2F_file_with_multiple_range_request_includes_correct_bytes#01/Header_Content-Range',
      'TestGatewayUnixFSFileRanges/GET_for_%2Fipfs%2F_file_with_multiple_range_request_includes_correct_bytes#01/Body'
    ]
  },
  {
    name: 'TestGatewaySymlink',
    run: ['TestGatewaySymlink'],
    successRate: 55.56,
    expectPassing: [
      'TestGatewaySymlink/Test_the_directory_raw_query/Status_code',
      'TestGatewaySymlink/Test_the_directory_raw_query/Body',
      'TestGatewaySymlink/Test_the_directory_raw_query'
    ]
  },
  {
    name: 'TestGatewayCacheWithIPNS',
    run: ['TestGatewayCacheWithIPNS'],
    successRate: 83.33,
    expectPassing: [
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_dir_listing_succeeds/Check_0/Header_X-Ipfs-Path',
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_dir_listing_succeeds/Check_1/Check_0',
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_dir_listing_succeeds/Check_1/Check_1',
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_dir_listing_succeeds/Check_1',
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_dir_with_index.html_succeeds/Check_0/Status_code',
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_dir_with_index.html_succeeds/Check_0/Header_X-Ipfs-Path',
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_dir_with_index.html_succeeds/Check_0/Header_X-Ipfs-Roots',
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_dir_with_index.html_succeeds/Check_1/Check_0',
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_dir_with_index.html_succeeds/Check_1/Check_1',
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_dir_with_index.html_succeeds/Check_1',
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_file_succeeds/Check_0/Status_code',
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_file_succeeds/Check_0/Header_X-Ipfs-Path',
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_file_succeeds/Check_0/Header_X-Ipfs-Roots',
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_file_succeeds/Check_1/Check_0',
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_file_succeeds/Check_1/Check_1',
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_file_succeeds/Check_1',
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_dir_as_DAG-JSON_succeeds/Check_0/Status_code',
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_dir_as_DAG-JSON_succeeds/Check_0',
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_dir_as_DAG-JSON_succeeds/Check_1/Check_0',
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_dir_as_DAG-JSON_succeeds/Check_1/Check_1',
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_dir_as_DAG-JSON_succeeds/Check_1',
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_dir_as_DAG-JSON_succeeds',
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_dir_as_JSON_succeeds/Check_0/Status_code',
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_dir_as_JSON_succeeds/Check_0',
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_dir_as_JSON_succeeds/Check_1/Check_0',
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_dir_as_JSON_succeeds/Check_1/Check_1',
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_dir_as_JSON_succeeds/Check_1',
      'TestGatewayCacheWithIPNS/GET_for_%2Fipns%2F_unixfs_dir_as_JSON_succeeds'
    ]
  },
  // {
  //   // passes at the set successRate, but takes incredibly long (consistently ~2m).. disabling for now.
  //   name: 'TestGatewayCache',
  //   run: ['TestGatewayCache'],
  //   skip: ['TestGatewayCacheWithIPNS'],
  //   successRate: 59.38,
  //   timeout: 1200000
  // },
  {
    name: 'TestUnixFSDirectoryListing',
    run: ['TestUnixFSDirectoryListing'],
    skip: [
      'TestUnixFSDirectoryListingOnSubdomainGateway',
      'TestUnixFSDirectoryListing/.*TODO:_cleanup_Kubo-specifics'
    ],
    successRate: 50,
    expectPassing: [
      'TestUnixFSDirectoryListing/path_gw:_redirect_dir_listing_to_URL_with_trailing_slash/Status_code',
      'TestUnixFSDirectoryListing/GET_for_%2Fipfs%2Fcid%2Ffile_UnixFS_file_that_does_not_exist_returns_404/Status_code',
      'TestUnixFSDirectoryListing/GET_for_%2Fipfs%2Fcid%2Ffile_UnixFS_file_that_does_not_exist_returns_404'
    ]
  },
  {
    name: 'TestTar',
    run: ['TestTar'],
    successRate: 79.17,
    expectPassing: [
      'TestTar/GET_TAR_with_format=tar_and_extract/Status_code',
      'TestTar/GET_TAR_with_format=tar_and_extract/Header_Content-Disposition',
      'TestTar/GET_TAR_with_format=tar_and_extract/Header_Content-Type',
      'TestTar/GET_TAR_with_format=tar_and_extract/Body',
      'TestTar/GET_TAR_with_%27Accept:_application%2Fx-tar%27_and_extract/Status_code',
      'TestTar/GET_TAR_with_%27Accept:_application%2Fx-tar%27_and_extract/Header_Content-Disposition',
      'TestTar/GET_TAR_with_%27Accept:_application%2Fx-tar%27_and_extract/Header_Content-Type',
      'TestTar/GET_TAR_with_%27Accept:_application%2Fx-tar%27_and_extract/Header_Etag',
      'TestTar/GET_TAR_with_%27Accept:_application%2Fx-tar%27_and_extract/Body',
      'TestTar/GET_TAR_has_expected_root_directory/Status_code',
      'TestTar/GET_TAR_has_expected_root_directory/Body',
      'TestTar/GET_TAR_has_expected_root_directory',
      'TestTar/GET_TAR_with_explicit_%3Ffilename=_succeeds_with_modified_Content-Disposition_header/Status_code',
      'TestTar/GET_TAR_with_explicit_%3Ffilename=_succeeds_with_modified_Content-Disposition_header/Header_Content-Disposition',
      'TestTar/GET_TAR_with_explicit_%3Ffilename=_succeeds_with_modified_Content-Disposition_header',
      'TestTar/GET_TAR_with_relative_paths_inside_root_works/Status_code'
    ]
  }
]

interface ReportDetails {
  passingTests: string[]
  failingTests: string[]
  failureCount: number
  successCount: number
  successRate: number
}

async function getReportDetails (path: string): Promise<ReportDetails> {
  let failureCount = 0
  let successCount = 0
  const passingTests: string[] = []
  const failingTests: string[] = []

  // parse the newline delimited JSON report at gwc-report-${name}.json and count the number of "PASS:" and "FAIL:" lines
  const report = await readFile(path, 'utf8')
  const lines = report.split('\n')
  for (const line of lines) {
    if (line.includes('--- FAIL:')) {
      failureCount++
      failingTests.push(line.split('--- FAIL: ')[1].split(' ')[0])
    } else if (line.includes('--- PASS:')) {
      successCount++
      passingTests.push(line.split('--- PASS: ')[1].split(' ')[0])
    }
  }
  const successRate = Number.parseFloat(((successCount / (successCount + failureCount)) * 100).toFixed(2))

  return {
    failingTests,
    passingTests,
    failureCount,
    successCount,
    successRate
  }
}

describe('@helia/verified-fetch - gateway conformance', function () {
  before(async () => {
    if (process.env.KUBO_GATEWAY == null) {
      throw new Error('KUBO_GATEWAY env var is required')
    }
    if (process.env.SERVER_PORT == null) {
      throw new Error('SERVER_PORT env var is required')
    }
    if (process.env.CONFORMANCE_HOST == null) {
      throw new Error('CONFORMANCE_HOST env var is required')
    }
    // see https://stackoverflow.com/questions/71074255/use-custom-dns-resolver-for-any-request-in-nodejs
    // EVERY undici/fetch request host resolves to local IP. Without this, Node.js does not resolve subdomain requests properly
    const staticDnsAgent = new Agent({
      connect: {
        lookup: (_hostname, _options, callback) => { callback(null, [{ address: '0.0.0.0', family: 4 }]) }
      }
    })
    setGlobalDispatcher(staticDnsAgent)
  })

  describe('smokeTests', () => {
    [
      ['basic server path request works', `http://localhost:${process.env.SERVER_PORT}/ipfs/bafkqabtimvwgy3yk`],
      ['basic server subdomain request works', `http://bafkqabtimvwgy3yk.ipfs.localhost:${process.env.SERVER_PORT}`]
    ].forEach(([name, url]) => {
      it(name, async () => {
        const resp = await fetch(url)
        expect(resp).to.be.ok()
        expect(resp.status).to.equal(200)
        const text = await resp.text()
        expect(text.trim()).to.equal('hello')
      })
    })
  })

  describe('conformance testing', () => {
    const binaryPath = getGatewayConformanceBinaryPath()
    before(async () => {
      const log = logger.forComponent('before')
      if (process.env.GATEWAY_CONFORMANCE_BINARY != null) {
        log('Using custom gateway-conformance binary at %s', binaryPath)
        return
      }
      const gwcVersion = GWC_IMAGE.split(':').pop()
      const { stdout, stderr } = await execa('go', ['install', `github.com/ipfs/gateway-conformance/cmd/gateway-conformance@${gwcVersion}`], { reject: true })
      log(stdout)
      log.error(stderr)
    })

    after(async () => {
      const log = logger.forComponent('after')

      if (process.env.GATEWAY_CONFORMANCE_BINARY == null) {
        try {
          await execa('rm', [binaryPath])
          log('gateway-conformance binary successfully uninstalled.')
        } catch (error) {
          log.error(`Error removing "${binaryPath}"`, error)
        }
      } else {
        log('Not removing custom gateway-conformance binary at %s', binaryPath)
      }
    })

    tests.forEach(({ name, spec, skip, run, timeout, successRate: minSuccessRate, expectPassing, expectFailing }) => {
      const log = logger.forComponent(`output:${name}`)
      const expectedSuccessRate = process.env.SUCCESS_RATE != null ? Number.parseFloat(process.env.SUCCESS_RATE) : minSuccessRate

      function logIndividualTestResult (passOrFail: string, test: string): void {
        log.trace(`${passOrFail}: ${test}`)
      }
      it(`${name} has a success rate of at least ${expectedSuccessRate ?? 0}%`, async function () {
        if (timeout != null) {
          this.timeout(timeout)
        }

        const { stderr, stdout } = await execa(binaryPath, getConformanceTestArgs(name,
          [
            ...(spec != null ? ['--specs', spec] : [])
          ],
          [
            ...((skip != null) ? ['-skip', `${skip.join('|')}`] : []),
            ...((run != null) ? ['-run', `${run.join('|')}`] : [])
          ]
        ), { reject: false, cancelSignal: timeout != null ? AbortSignal.timeout(timeout) : undefined })

        log(stdout)
        log.error(stderr)

        const { successRate, failingTests, passingTests } = await getReportDetails(`gwc-report-${name}.json`)

        // log each failing and passing test
        log.trace('Passing tests:')
        passingTests.forEach(logIndividualTestResult.bind(null, 'PASS'))
        log.trace('Failing tests:')
        failingTests.forEach(logIndividualTestResult.bind(null, 'FAIL'))
        expect(successRate).to.be.greaterThanOrEqual(expectedSuccessRate ?? 0)
      })

      describe(`${name} passes and fails tests as expected`, function () {
        let passingTests: string[]
        let failingTests: string[]
        before(async function () {
          const details = await getReportDetails(`gwc-report-${name}.json`)
          passingTests = details.passingTests
          failingTests = details.failingTests
        })
        if (expectPassing != null) {
          for (const test of expectPassing) {
            // eslint-disable-next-line no-loop-func
            it(`${test}`, () => {
              expect(passingTests).to.include(test)
            })
          }
        }
        if (expectFailing != null) {
          for (const test of expectFailing) {
            // eslint-disable-next-line no-loop-func
            it(`${test}`, () => {
              expect(failingTests).to.include(test)
            })
          }
        }
      })
    })

    /**
     * This test ensures new or existing gateway-conformance tests that fail are caught and addressed appropriately.
     * Eventually, we will not need the `tests.forEach` tests and can just run all the recommended tests directly,
     * as this test does.
     */
    it('has expected total failures and successes', async function () {
      this.timeout(200000)
      const log = logger.forComponent('output:all')

      const { stderr, stdout } = await execa(binaryPath, getConformanceTestArgs('all', [], []), { reject: false, cancelSignal: AbortSignal.timeout(200000) })

      log(stdout)
      log.error(stderr)

      const { successRate } = await getReportDetails('gwc-report-all.json')
      const knownSuccessRate = 45.52
      // check latest success rate with `SUCCESS_RATE=100 npm run test -- -g 'total'`
      const expectedSuccessRate = process.env.SUCCESS_RATE != null ? Number.parseFloat(process.env.SUCCESS_RATE) : knownSuccessRate

      expect(successRate).to.be.greaterThanOrEqual(expectedSuccessRate)
    })
  })
})
