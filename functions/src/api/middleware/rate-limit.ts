/**
 * Server-side rate limiting middleware.
 *
 * Uses Firestore counters to enforce per-clientId request limits.
 * Rate limits are checked against a sliding window (1-minute buckets).
 *
 * Design decisions:
 *   - Per-clientId (not per-IP) — aligns with API key authentication
 *   - 1-minute sliding window using Firestore documents
 *   - Configurable limits per key type (cid_ vs svr_)
 *   - Soft limit returns 429 with Retry-After header
 *   - Counter documents auto-expire via TTL (Firestore TTL policy)
 */

import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { TooManyRequestsError } from "../../utils/errors.js";
import {
  RATE_LIMIT_CLIENT_RPM,
  RATE_LIMIT_SERVER_RPM,
  RATE_LIMIT_ENABLED,
} from "../../utils/constants.js";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check and increment the rate limit counter for a clientId.
 *
 * @param db - Firestore instance
 * @param clientId - The API key being rate-limited
 * @throws TooManyRequestsError if the rate limit is exceeded
 */
export async function checkRateLimit(
  db: Firestore,
  clientId: string,
): Promise<void> {
  if (!RATE_LIMIT_ENABLED) return;

  const isServerKey = clientId.startsWith("svr_");
  const maxRequests = isServerKey
    ? RATE_LIMIT_SERVER_RPM
    : RATE_LIMIT_CLIENT_RPM;

  // Use 1-minute buckets keyed by clientId + minute timestamp
  const now = new Date();
  const minuteBucket = Math.floor(now.getTime() / 60_000);
  const docId = `${clientId}_${minuteBucket}`;

  const counterRef = db.collection("rateLimits").doc(docId);

  const result = await db.runTransaction<RateLimitResult>(async (tx) => {
    const doc = await tx.get(counterRef);
    const currentCount = doc.exists ? (doc.data()?.count ?? 0) : 0;

    if (currentCount >= maxRequests) {
      const resetAt = new Date((minuteBucket + 1) * 60_000);
      return { allowed: false, remaining: 0, resetAt };
    }

    // Increment counter and set TTL (auto-cleanup after 5 minutes)
    const expiresAt = new Date((minuteBucket + 5) * 60_000);
    tx.set(
      counterRef,
      {
        count: FieldValue.increment(1),
        clientId,
        expiresAt,
      },
      { merge: true },
    );

    return {
      allowed: true,
      remaining: maxRequests - currentCount - 1,
      resetAt: new Date((minuteBucket + 1) * 60_000),
    };
  });

  if (!result.allowed) {
    const retryAfter = Math.ceil(
      (result.resetAt.getTime() - now.getTime()) / 1000,
    );
    throw new TooManyRequestsError(
      `Rate limit exceeded. Max ${maxRequests} requests per minute.`,
      retryAfter,
    );
  }
}
