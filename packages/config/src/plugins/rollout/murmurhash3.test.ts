import { describe, expect, it } from "vitest";

import { murmurhash3_32 } from "./murmurhash3";

describe("murmurhash3_32", () => {
  it("returns a 32-bit unsigned integer", () => {
    const result = murmurhash3_32("hello", 0);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(0xffffffff);
  });

  it("is deterministic — same input and seed produce same output", () => {
    const a = murmurhash3_32("test-key:user-123", 0);
    const b = murmurhash3_32("test-key:user-123", 0);
    expect(a).toBe(b);
  });

  it("produces different values for different inputs", () => {
    const a = murmurhash3_32("feature.beta:user-1", 0);
    const b = murmurhash3_32("feature.beta:user-2", 0);
    expect(a).not.toBe(b);
  });

  it("produces different values for different seeds", () => {
    const a = murmurhash3_32("hello", 0);
    const b = murmurhash3_32("hello", 42);
    expect(a).not.toBe(b);
  });

  it("handles empty string", () => {
    const result = murmurhash3_32("", 0);
    expect(result).toBe(0); // MurmurHash3("", 0) = 0
  });

  it("handles single character", () => {
    const result = murmurhash3_32("a", 0);
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("handles strings with length not divisible by 4 (remainder handling)", () => {
    // 1 byte remainder
    const r1 = murmurhash3_32("a", 0);
    // 2 byte remainder
    const r2 = murmurhash3_32("ab", 0);
    // 3 byte remainder
    const r3 = murmurhash3_32("abc", 0);
    // 4 byte (no remainder)
    const r4 = murmurhash3_32("abcd", 0);

    // All should be valid uint32
    for (const r of [r1, r2, r3, r4]) {
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(0xffffffff);
    }

    // All different
    const set = new Set([r1, r2, r3, r4]);
    expect(set.size).toBe(4);
  });

  it("handles multi-byte UTF-8 characters", () => {
    const result = murmurhash3_32("日本語", 0);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(0xffffffff);
  });

  // Known reference values from standard MurmurHash3 implementations
  it("matches known reference value for 'hello' with seed 0", () => {
    // MurmurHash3_x86_32("hello", 0) = 613153351
    const result = murmurhash3_32("hello", 0);
    expect(result).toBe(613153351);
  });
});
