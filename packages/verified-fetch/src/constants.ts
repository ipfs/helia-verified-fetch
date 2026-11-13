export const CODEC_IDENTITY = 0x00
export const CODEC_CBOR = 0x51
export const CODEC_LIBP2P_KEY = 0x72

export const SESSION_CACHE_MAX_SIZE = 100
export const SESSION_CACHE_TTL_MS = 60 * 1000
export const MAX_HEADER_VALUE_LENGTH = 8192

/**
 * How many bytes from the start of a file to pass to the content type parser.
 * One byte less than the default 256KiB chunk size because the exporter treats
 * a block that starts exactly at the end of a range as part of it, so a 256KiB
 * read would also load the second block. The `- 1` can go once a release with
 * https://github.com/ipfs/js-ipfs-unixfs/pull/503 is the minimum version
 */
export const CONTENT_TYPE_SNIFF_SIZE = 256 * 1024 - 1
