import crypto from "crypto";

/**
 * Hash API key using SHA-256 + base64url (Better Auth compatible)
 *
 * Better Auth uses: SHA-256 -> base64url encoding (no padding)
 * This ensures compatibility with Better Auth's defaultKeyHasher.
 *
 * @see https://github.com/better-auth/better-auth defaultKeyHasher
 * @param key - The plaintext API key to hash
 * @returns The hashed key in base64url format
 */
export function hashApiKey(key: string): string {
  const hash = crypto.createHash("sha256").update(key).digest();
  // Convert to base64url without padding (matches Better Auth's defaultKeyHasher)
  return hash.toString("base64url");
}
