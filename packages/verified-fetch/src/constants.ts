export const CODEC_IDENTITY = 0x00
export const CODEC_CBOR = 0x51
export const CODEC_LIBP2P_KEY = 0x72

export const SESSION_CACHE_MAX_SIZE = 100
export const SESSION_CACHE_TTL_MS = 60 * 1000
export const MAX_HEADER_VALUE_LENGTH = 8192

/**
 * How many bytes from the start of a file to pass to the content type parser.
 * One byte less than the default 256KiB chunk size so a file imported with
 * default options only loads its first block - a read that ends exactly on a
 * block boundary also loads the next block
 */
export const CONTENT_TYPE_SNIFF_SIZE = 256 * 1024 - 1
