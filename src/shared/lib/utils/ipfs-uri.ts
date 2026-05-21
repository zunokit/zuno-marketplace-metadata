/**
 * IPFS URI helpers.
 *
 * The marketplace receives metadata URLs from many sources (Pinata uploads,
 * partner integrations, end-user mints). Before storing or scheduling a pin
 * we want to:
 *
 *   1. Recognise `ipfs://...` URIs and split them into `{ cid, path }`.
 *   2. Sanity-check that the CID is structurally valid (v0 base58btc or
 *      v1 base32 lower-case) without dragging in `multiformats` just to
 *      decode the multihash.
 *   3. Resolve an `ipfs://` URI to an https gateway URL for fetching.
 *
 * The CID checks are intentionally cheap regex + alphabet checks — they
 * are *not* a full multihash verification but they catch every shape mismatch
 * we have seen in production (typos, half-pasted hashes, base64 strings, etc.).
 */

// CIDv0: "Qm" + 44 base58btc characters (no 0, O, I, l).
const CID_V0_REGEX = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/

// CIDv1 base32 lower-case: starts with "b", body is RFC 4648 base32 (lower).
// Length varies with multihash length but is always >= 59.
const CID_V1_BASE32_REGEX = /^b[a-z2-7]{58,}$/

// CIDv1 base16 lower-case (rare but valid).
const CID_V1_BASE16_REGEX = /^f[0-9a-f]{60,}$/

/**
 * Match a CIDv0 (`Qm…`) without performing multihash verification.
 */
export function isCidV0(value: string): boolean {
  return CID_V0_REGEX.test(value)
}

/**
 * Match a CIDv1 in base32 (`b…`) or base16 (`f…`) — the two encodings we have
 * observed from Pinata, web3.storage, NFT.Storage, and IPFS Desktop.
 */
export function isCidV1(value: string): boolean {
  return CID_V1_BASE32_REGEX.test(value) || CID_V1_BASE16_REGEX.test(value)
}

/**
 * Match any structurally-valid CID we accept (v0 or v1).
 */
export function isValidIpfsCid(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0) return false
  return isCidV0(value) || isCidV1(value)
}

export interface ParsedIpfsUri {
  cid: string
  /** Path after the CID, **without** a leading slash. Empty when none. */
  path: string
}

/**
 * Parse `ipfs://CID[/path]` into its components.
 *
 * Accepts a single leading `ipfs://` and an optional `ipfs/` prefix
 * (some sources double the prefix, e.g. `ipfs://ipfs/QmFoo`).
 *
 * Returns `null` when the string is not an IPFS URI or the CID is malformed.
 */
export function parseIpfsUri(uri: string): ParsedIpfsUri | null {
  if (typeof uri !== 'string') return null
  const trimmed = uri.trim()
  if (!trimmed.toLowerCase().startsWith('ipfs://')) return null

  let rest = trimmed.slice('ipfs://'.length)
  if (rest.startsWith('ipfs/')) rest = rest.slice('ipfs/'.length)
  // Allow leading slash users sometimes write.
  while (rest.startsWith('/')) rest = rest.slice(1)
  if (rest.length === 0) return null

  const slashIdx = rest.indexOf('/')
  const cid = slashIdx === -1 ? rest : rest.slice(0, slashIdx)
  const path = slashIdx === -1 ? '' : rest.slice(slashIdx + 1)

  if (!isValidIpfsCid(cid)) return null
  return { cid, path }
}

/**
 * Returns `true` when the input is a syntactically valid `ipfs://` URI with
 * a recognisable CID.
 */
export function isIpfsUri(value: string): boolean {
  return parseIpfsUri(value) !== null
}

export interface GatewayOptions {
  /** Public IPFS gateway base, e.g. `https://ipfs.io` (no trailing slash required). */
  gateway?: string
}

const DEFAULT_GATEWAY = 'https://ipfs.io'

/**
 * Convert an `ipfs://` URI to an HTTPS gateway URL.
 *
 * Returns `null` when the input is not a valid IPFS URI so callers can fall
 * back without throwing.
 */
export function ipfsUriToGatewayUrl(
  uri: string,
  options: GatewayOptions = {},
): string | null {
  const parsed = parseIpfsUri(uri)
  if (!parsed) return null

  const gateway = (options.gateway ?? DEFAULT_GATEWAY).replace(/\/+$/, '')
  return parsed.path
    ? `${gateway}/ipfs/${parsed.cid}/${parsed.path}`
    : `${gateway}/ipfs/${parsed.cid}`
}
