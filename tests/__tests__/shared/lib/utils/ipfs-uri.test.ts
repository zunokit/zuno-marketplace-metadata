import {
  ipfsUriToGatewayUrl,
  isCidV0,
  isCidV1,
  isIpfsUri,
  isValidIpfsCid,
  parseIpfsUri,
} from '@/shared/lib/utils/ipfs-uri'

// Real-world CIDs (no actual fetch — used purely for parsing).
const CID_V0 = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
const CID_V1 = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'

describe('isCidV0', () => {
  it('accepts a canonical Qm-prefixed CIDv0', () => {
    expect(isCidV0(CID_V0)).toBe(true)
  })

  it('rejects values that are too short or wrong-prefixed', () => {
    expect(isCidV0('Qm123')).toBe(false)
    expect(isCidV0('bafy' + CID_V0.slice(2))).toBe(false)
  })

  it('rejects characters outside the base58btc alphabet', () => {
    expect(isCidV0('Qm' + '0'.repeat(44))).toBe(false) // 0 is not in base58btc
    expect(isCidV0('Qm' + 'O'.repeat(44))).toBe(false)
    expect(isCidV0('Qm' + 'I'.repeat(44))).toBe(false)
    expect(isCidV0('Qm' + 'l'.repeat(44))).toBe(false)
  })
})

describe('isCidV1', () => {
  it('accepts a canonical base32 CIDv1', () => {
    expect(isCidV1(CID_V1)).toBe(true)
  })

  it('accepts a base16 CIDv1', () => {
    const cidV1Hex = 'f' + 'a'.repeat(60)
    expect(isCidV1(cidV1Hex)).toBe(true)
  })

  it('rejects values that do not start with b/f', () => {
    expect(isCidV1('a' + CID_V1.slice(1))).toBe(false)
  })

  it('rejects strings shorter than the minimum length', () => {
    expect(isCidV1('b' + 'a'.repeat(10))).toBe(false)
  })
})

describe('isValidIpfsCid', () => {
  it('accepts both v0 and v1 CIDs', () => {
    expect(isValidIpfsCid(CID_V0)).toBe(true)
    expect(isValidIpfsCid(CID_V1)).toBe(true)
  })

  it('rejects empty / non-string input', () => {
    expect(isValidIpfsCid('')).toBe(false)
    // @ts-expect-error – exercising defensive coercion
    expect(isValidIpfsCid(null)).toBe(false)
    // @ts-expect-error – exercising defensive coercion
    expect(isValidIpfsCid(undefined)).toBe(false)
  })
})

describe('parseIpfsUri', () => {
  it('parses an ipfs:// URI with a CID only', () => {
    expect(parseIpfsUri(`ipfs://${CID_V0}`)).toEqual({ cid: CID_V0, path: '' })
  })

  it('parses an ipfs:// URI with a sub-path', () => {
    expect(parseIpfsUri(`ipfs://${CID_V1}/metadata.json`)).toEqual({
      cid: CID_V1,
      path: 'metadata.json',
    })
  })

  it('strips a double "ipfs/" prefix', () => {
    expect(parseIpfsUri(`ipfs://ipfs/${CID_V0}/1.json`)).toEqual({
      cid: CID_V0,
      path: '1.json',
    })
  })

  it('handles a leading slash before the CID', () => {
    expect(parseIpfsUri(`ipfs:///${CID_V0}`)).toEqual({ cid: CID_V0, path: '' })
  })

  it('is case-insensitive on the scheme', () => {
    expect(parseIpfsUri(`IPFS://${CID_V0}`)?.cid).toBe(CID_V0)
  })

  it('trims surrounding whitespace', () => {
    expect(parseIpfsUri(`   ipfs://${CID_V0}   `)?.cid).toBe(CID_V0)
  })

  it('returns null for invalid schemes', () => {
    expect(parseIpfsUri(`https://ipfs.io/ipfs/${CID_V0}`)).toBeNull()
    expect(parseIpfsUri('ipfs://')).toBeNull()
  })

  it('returns null for a malformed CID', () => {
    expect(parseIpfsUri('ipfs://NotACid')).toBeNull()
    expect(parseIpfsUri('ipfs://Qm0000')).toBeNull()
  })

  it('returns null for non-string input', () => {
    // @ts-expect-error – exercising defensive coercion
    expect(parseIpfsUri(42)).toBeNull()
  })
})

describe('isIpfsUri', () => {
  it('returns true for parseable inputs', () => {
    expect(isIpfsUri(`ipfs://${CID_V0}/x.json`)).toBe(true)
  })

  it('returns false for plain CIDs without scheme', () => {
    expect(isIpfsUri(CID_V0)).toBe(false)
  })
})

describe('ipfsUriToGatewayUrl', () => {
  it('renders the default ipfs.io URL', () => {
    expect(ipfsUriToGatewayUrl(`ipfs://${CID_V0}`)).toBe(
      `https://ipfs.io/ipfs/${CID_V0}`,
    )
  })

  it('preserves the sub-path', () => {
    expect(ipfsUriToGatewayUrl(`ipfs://${CID_V1}/meta.json`)).toBe(
      `https://ipfs.io/ipfs/${CID_V1}/meta.json`,
    )
  })

  it('honours a custom gateway and strips trailing slashes', () => {
    expect(
      ipfsUriToGatewayUrl(`ipfs://${CID_V0}`, {
        gateway: 'https://gateway.example.org/',
      }),
    ).toBe(`https://gateway.example.org/ipfs/${CID_V0}`)
  })

  it('returns null for invalid input', () => {
    expect(ipfsUriToGatewayUrl('https://example.com')).toBeNull()
    expect(ipfsUriToGatewayUrl('ipfs://nope')).toBeNull()
  })
})
