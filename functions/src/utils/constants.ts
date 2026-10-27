/**
 * Shared constants for Cloud Functions configuration.
 */

/** Default CDN cache duration in seconds */
export const CDN_CACHE_SECONDS = 60;

/**
 * CDN (shared) cache duration in seconds for the /api/v1/version endpoint.
 *
 * This is the change-propagation latency: a config change is picked up by a
 * client no later than the next time it re-polls /version past this cache
 * window. Larger = fewer getVersion invocations, slower propagation.
 *
 * Configured at deploy time via the VERSION_CACHE_SECONDS environment
 * variable (see functions/.env.example). Defaults to 300 (5 minutes).
 * Invalid or non-positive values fall back to the default.
 *
 * NOTE: changing this requires redeploying the functions — CDN cache
 * directives are emitted in the response header and cannot change at runtime.
 */
export const VERSION_CACHE_SECONDS: number = (() => {
  const raw = process.env.VERSION_CACHE_SECONDS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 300;
})();

/**
 * Browser (client) cache duration in seconds for the /api/v1/version endpoint.
 * Kept short relative to the shared CDN window. Two-thirds of the CDN value,
 * capped at 60s, so the browser revalidates against the CDN reasonably often.
 */
export const VERSION_BROWSER_CACHE_SECONDS: number = Math.min(
  60,
  Math.max(1, Math.floor(VERSION_CACHE_SECONDS / 2)),
);

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
