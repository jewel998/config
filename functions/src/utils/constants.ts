/**
 * Shared constants for Cloud Functions configuration.
 */

/** Maximum Firestore batch write size */
export const MAX_BATCH_SIZE = 500;

/** Default CDN cache duration in seconds */
export const CDN_CACHE_SECONDS = 60;

/** Maximum function instances per handler */
export const MAX_INSTANCES = 10;

/** Function timeout in seconds (9 minutes) */
export const FUNCTION_TIMEOUT_SECONDS = 540;

/** Maximum context payload size in bytes (10KB) */
export const MAX_CONTEXT_SIZE_BYTES = 10240;
