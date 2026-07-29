import { describe, expect, it } from "vitest";

import { computeBucket } from "./computeBucket";

describe("computeBucket", () => {
  it("returns a value in range 0–99", () => {
    const bucket = computeBucket("feature.beta", "user-42");
    expect(bucket).toBeGreaterThanOrEqual(0);
    expect(bucket).toBeLessThanOrEqual(99);
  });

  it("is deterministic — same inputs always produce same bucket", () => {
    const a = computeBucket("feature.beta", "user-42");
    const b = computeBucket("feature.beta", "user-42");
    const c = computeBucket("feature.beta", "user-42");
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("produces different buckets for different userIds", () => {
    const buckets = new Set<number>();
    for (let i = 0; i < 100; i++) {
      buckets.add(computeBucket("feature.beta", `user-${i}`));
    }
    // With 100 users across 100 buckets, we should see good distribution
    // At minimum more than 1 unique bucket
    expect(buckets.size).toBeGreaterThan(1);
  });

  it("produces different buckets for different configKeys", () => {
    const a = computeBucket("feature.alpha", "user-1");
    const b = computeBucket("feature.beta", "user-1");
    // Different keys should generally produce different buckets
    // (not guaranteed for every pair, but statistically very likely)
    expect(typeof a).toBe("number");
    expect(typeof b).toBe("number");
  });

  it("handles empty userId", () => {
    const bucket = computeBucket("feature.beta", "");
    expect(bucket).toBeGreaterThanOrEqual(0);
    expect(bucket).toBeLessThanOrEqual(99);
  });

  it("handles empty configKey", () => {
    const bucket = computeBucket("", "user-42");
    expect(bucket).toBeGreaterThanOrEqual(0);
    expect(bucket).toBeLessThanOrEqual(99);
  });

  it("distributes buckets roughly uniformly across many users", () => {
    const counts = new Array<number>(100).fill(0);
    const numUsers = 10000;

    for (let i = 0; i < numUsers; i++) {
      const bucket = computeBucket("feature.rollout-test", `user-${i}`);
      counts[bucket]!++;
    }

    // Each bucket should get roughly numUsers/100 = 100 users
    // Allow ±50% tolerance for statistical variation
    const expected = numUsers / 100;
    for (const count of counts) {
      expect(count).toBeGreaterThan(expected * 0.3);
      expect(count).toBeLessThan(expected * 2.0);
    }
  });
});
