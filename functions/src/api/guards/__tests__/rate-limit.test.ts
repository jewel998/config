import { TooManyRequestsError } from "@jewel998/api";
import { describe, it, expect } from "vitest";

import { RateLimitMiddleware } from "../rate-limit.guard";
import { makeCtx } from "./helpers";

describe("RateLimitMiddleware", () => {
  it("allows requests under the limit", () => {
    const mw = new RateLimitMiddleware();
    const ctx = makeCtx({ clientId: "cid_test_rl_1", isServerKey: false });
    expect(() => mw.use(ctx)).not.toThrow();
  });

  it("throws TooManyRequestsError when limit exceeded for client key", () => {
    const mw = new RateLimitMiddleware();
    // Client key limit is 300 RPM — exhaust it
    for (let i = 0; i < 300; i++) {
      const ctx = makeCtx({ clientId: "cid_rate_flood", isServerKey: false });
      mw.use(ctx);
    }
    // 301st should throw
    const ctx = makeCtx({ clientId: "cid_rate_flood", isServerKey: false });
    expect(() => mw.use(ctx)).toThrow(TooManyRequestsError);
  });

  it("throws TooManyRequestsError when limit exceeded for server key", () => {
    const mw = new RateLimitMiddleware();
    // Server key limit is 120 RPM
    for (let i = 0; i < 120; i++) {
      const ctx = makeCtx({ clientId: "svr_rate_flood", isServerKey: true });
      mw.use(ctx);
    }
    const ctx = makeCtx({ clientId: "svr_rate_flood", isServerKey: true });
    expect(() => mw.use(ctx)).toThrow(TooManyRequestsError);
  });

  it("includes retryAfter in the error", () => {
    const mw = new RateLimitMiddleware();
    for (let i = 0; i < 300; i++) {
      const ctx = makeCtx({ clientId: "cid_retry_after", isServerKey: false });
      mw.use(ctx);
    }
    const ctx = makeCtx({ clientId: "cid_retry_after", isServerKey: false });
    try {
      mw.use(ctx);
    } catch (e) {
      expect((e as TooManyRequestsError).retryAfter).toBeGreaterThan(0);
      expect((e as TooManyRequestsError).retryAfter).toBeLessThanOrEqual(60);
    }
  });

  it("different clientIds have independent counters", () => {
    const mw = new RateLimitMiddleware();
    // Fill up one client
    for (let i = 0; i < 300; i++) {
      mw.use(makeCtx({ clientId: "cid_full_bucket", isServerKey: false }));
    }
    // Another client should still work
    const ctx = makeCtx({ clientId: "cid_fresh_bucket", isServerKey: false });
    expect(() => mw.use(ctx)).not.toThrow();
  });
});
