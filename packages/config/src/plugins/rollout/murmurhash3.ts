// ═══════════════════════════════════════════════════════════════
// MurmurHash3_x86_32
// Public domain — Austin Appleby
// Adapted for TypeScript (operates on UTF-8 encoded string bytes)
// ═══════════════════════════════════════════════════════════════

/**
 * MurmurHash3_x86_32 — deterministic 32-bit hash.
 * Used for percentage rollout bucketing (same algorithm as flagd/OpenFeature).
 */
export function murmurhash3_32(key: string, seed: number = 0): number {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(key);
  const len = bytes.length;
  let h1 = seed >>> 0;
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;

  let i = 0;
  while (i + 4 <= len) {
    let k1 =
      (bytes[i]! | (bytes[i + 1]! << 8) | (bytes[i + 2]! << 16) | (bytes[i + 3]! << 24)) >>> 0;
    k1 = Math.imul(k1, c1) >>> 0;
    k1 = ((k1 << 15) | (k1 >>> 17)) >>> 0;
    k1 = Math.imul(k1, c2) >>> 0;
    h1 ^= k1;
    h1 = ((h1 << 13) | (h1 >>> 19)) >>> 0;
    h1 = (Math.imul(h1, 5) + 0xe6546b64) >>> 0;
    i += 4;
  }

  let k1 = 0;
  const remainder = len & 3;
  if (remainder >= 3) {
    k1 ^= bytes[i + 2]! << 16;
  }
  if (remainder >= 2) {
    k1 ^= bytes[i + 1]! << 8;
  }
  if (remainder >= 1) {
    k1 ^= bytes[i]!;
    k1 = Math.imul(k1, c1) >>> 0;
    k1 = ((k1 << 15) | (k1 >>> 17)) >>> 0;
    k1 = Math.imul(k1, c2) >>> 0;
    h1 ^= k1;
  }

  h1 ^= len;
  // fmix32
  h1 ^= h1 >>> 16;
  h1 = Math.imul(h1, 0x85ebca6b) >>> 0;
  h1 ^= h1 >>> 13;
  h1 = Math.imul(h1, 0xc2b2ae35) >>> 0;
  h1 ^= h1 >>> 16;

  return h1 >>> 0;
}
