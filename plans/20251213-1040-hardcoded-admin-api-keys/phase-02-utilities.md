# Phase 2: Security Utilities

Create two utility files for secure API key handling.

---

## File 1: Constant-Time Comparison

**Path:** `src/shared/lib/utils/constant-time-compare.ts`

```typescript
/**
 * Constant-Time String Comparison
 *
 * Prevents timing attacks by ensuring comparison takes the same
 * time regardless of where strings differ. Uses XOR comparison
 * of buffer bytes.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 */
export function constantTimeCompare(a: string, b: string): boolean {
  // Get byte lengths
  const aLen = Buffer.byteLength(a);
  const bLen = Buffer.byteLength(b);
  const maxLen = Math.max(aLen, bLen);

  // Allocate fixed-size buffers
  const bufferA = Buffer.alloc(maxLen);
  const bufferB = Buffer.alloc(maxLen);

  // Copy strings to buffers
  Buffer.from(a).copy(bufferA);
  Buffer.from(b).copy(bufferB);

  // Length mismatch flag (set to 1 if lengths differ)
  let result = aLen === bLen ? 0 : 1;

  // XOR all bytes - accumulates differences without short-circuiting
  for (let i = 0; i < maxLen; i++) {
    result |= bufferA[i] ^ bufferB[i];
  }

  // Return true only if result is 0 (all bytes matched and same length)
  return result === 0;
}
```

---

## File 2: API Key Hashing

**Path:** `src/shared/lib/utils/api-key-hash.ts`

```typescript
import crypto from "crypto";

/**
 * Hash API key using SHA-256 + base64url encoding
 *
 * This matches Better Auth's default key hasher implementation:
 * - SHA-256 hash of the plaintext key
 * - Base64url encoding (no padding)
 *
 * @see https://github.com/better-auth/better-auth (defaultKeyHasher)
 *
 * @param key - Plaintext API key
 * @returns Hashed key in base64url format
 */
export function hashApiKey(key: string): string {
  const hash = crypto.createHash("sha256").update(key).digest();
  // Base64url without padding (matches Better Auth)
  return hash.toString("base64url");
}
```

---

## Export from Index (Optional)

If the project has `src/shared/lib/utils/index.ts`, add exports:

```typescript
export { constantTimeCompare } from "./constant-time-compare";
export { hashApiKey } from "./api-key-hash";
```

---

## Security Notes

### Timing Attacks

Standard string comparison (`===`) exits early when a mismatch is found. Attackers can measure response time to determine how many characters matched, allowing them to guess keys character-by-character.

Constant-time comparison:
- Always compares all bytes
- Uses XOR to accumulate differences
- Takes same time regardless of where strings differ

### Better Auth Compatibility

Better Auth uses SHA-256 + base64url for key storage. Our implementation matches exactly:
- `crypto.createHash("sha256")` - Same hash algorithm
- `.toString("base64url")` - Same encoding (no padding)

This ensures seeded keys can be verified by Better Auth's `verifyApiKey` API.
