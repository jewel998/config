import type { Middleware, RequestContext } from "@jewel998/api";
import { TooManyRequestsError } from "@jewel998/api";

import {
  RATE_LIMIT_CLIENT_RPM,
  RATE_LIMIT_SERVER_RPM,
  RATE_LIMIT_ENABLED,
} from "../../utils/constants";

interface RateLimitEntry {
  bucket: number;
  count: number;
}

const counters = new Map<string, RateLimitEntry>();
let lastEviction = Date.now();

function evictStale(): void {
  const now = Date.now();
  if (now - lastEviction < 300_000) return;
  lastEviction = now;
  const bucket = Math.floor(now / 60_000);
  for (const [key, entry] of counters) {
    if (bucket - entry.bucket > 2) counters.delete(key);
  }
}

/**
 * In-memory rate limiter. Runs as middleware (first layer).
 * Zero Firestore I/O — rejects before any downstream work.
 */
export class RateLimitMiddleware implements Middleware {
  use(ctx: RequestContext): void {
    if (!RATE_LIMIT_ENABLED) return;

    evictStale();

    const clientId = ctx.clientId as string;
    const isServerKey = ctx.isServerKey as boolean;
    const max = isServerKey ? RATE_LIMIT_SERVER_RPM : RATE_LIMIT_CLIENT_RPM;
    const now = Date.now();
    const bucket = Math.floor(now / 60_000);
    const existing = counters.get(clientId);

    if (!existing || existing.bucket !== bucket) {
      counters.set(clientId, { bucket, count: 1 });
      return;
    }

    if (existing.count >= max) {
      const retryAfter = Math.ceil(((bucket + 1) * 60_000 - now) / 1000);
      throw new TooManyRequestsError(
        `Rate limit exceeded. Max ${max} requests per minute.`,
        retryAfter,
      );
    }

    existing.count++;
  }
}
