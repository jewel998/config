/**
 * Shared constants for Cloud Functions configuration.
 */

/** Maximum Firestore batch write size */
export const MAX_BATCH_SIZE = 500;

/** Default CDN cache duration in seconds */
export const CDN_CACHE_SECONDS = 60;

/** Maximum function instances per handler */
export const MAX_INSTANCES = 10;

/**
 * Minimum warm instances for hot-path API functions.
 * Keeps instances warm to eliminate cold starts.
 * Cost: ~$3-5/month per warm instance on Blaze plan.
 * Set to 0 (default) for zero cost, or 1+ to eliminate cold starts.
 */
export const MIN_INSTANCES = 0;

/** Function timeout in seconds (9 minutes) */
export const FUNCTION_TIMEOUT_SECONDS = 540;

/** Maximum context payload size in bytes (10KB) */
export const MAX_CONTEXT_SIZE_BYTES = 10240;

/** Whether server-side rate limiting is enabled */
export const RATE_LIMIT_ENABLED = true;

/** Max requests per minute for client keys (cid_) */
export const RATE_LIMIT_CLIENT_RPM = 300;

/** Max requests per minute for server keys (svr_) */
export const RATE_LIMIT_SERVER_RPM = 120;

/**
 * Region for API functions.
 * Choose the region closest to your primary user base:
 *   - "us-central1" (default, Iowa)
 *   - "asia-south1" (Mumbai — best for India)
 *   - "europe-west1" (Belgium)
 *   - "asia-east1" (Taiwan)
 *   - "asia-southeast1" (Singapore)
 *
 * IMPORTANT: Your Firestore database must be in the same or nearby region
 * for optimal performance. Cross-region queries add 100-300ms per round-trip.
 */
export const API_REGION = "asia-south1";
