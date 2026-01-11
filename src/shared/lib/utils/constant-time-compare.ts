/**
 * Constant-time string comparison to prevent timing attacks
 *
 * Uses XOR comparison of buffer bytes regardless of string length
 * to ensure comparison takes same time whether strings match or not.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 */
export function constantTimeCompare(a: string, b: string): boolean {
  const aLen = Buffer.byteLength(a);
  const bLen = Buffer.byteLength(b);
  const maxLen = Math.max(aLen, bLen);

  const bufferA = Buffer.alloc(maxLen);
  const bufferB = Buffer.alloc(maxLen);

  Buffer.from(a).copy(bufferA);
  Buffer.from(b).copy(bufferB);

  let result = aLen === bLen ? 0 : 1;

  for (let i = 0; i < maxLen; i++) {
    result |= bufferA[i] ^ bufferB[i];
  }

  return result === 0;
}
