// ═══════════════════════════════════════════════════════════════
// Rollout Bucket Computation
// ═══════════════════════════════════════════════════════════════

import { murmurhash3_32 } from "./murmurhash3.js";

/**
 * Compute the rollout bucket (0–99) for a given configKey and userId.
 *
 * Algorithm:
 * 1. Concatenate: `${configKey}:${userId}`
 * 2. Compute MurmurHash3_x86_32 with seed 0
 * 3. Map to bucket: hash % 100
 *
 * Deterministic — same inputs always produce the same bucket.
 */
export function computeBucket(configKey: string, userId: string): number {
  const input = `${configKey}:${userId}`;
  const hash = murmurhash3_32(input, 0);
  return hash % 100;
}
