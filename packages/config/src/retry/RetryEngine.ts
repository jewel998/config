import { AuthenticationError, ConfigError, RateLimitError } from "../errors/index.js";
import type { RetryConfig } from "../types.js";
import { DEFAULT_RETRY } from "../types.js";

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const isNonRetryableError = (error: unknown): boolean => {
  if (error instanceof AuthenticationError) {
    return true;
  }
  if (error instanceof ConfigError) {
    // Client errors — retrying won't help
    switch (error.code) {
      case "REVOKED":
      case "BAD_REQUEST":
      case "FORBIDDEN":
      case "NOT_FOUND":
      case "METHOD_NOT_ALLOWED":
      case "PAYLOAD_TOO_LARGE":
      case "CONFLICT":
        return true;
    }
  }
  return false;
};

/**
 * Get the retry delay for an error. If the error is a RateLimitError with
 * a server-specified Retry-After value, use that instead of calculated backoff.
 */
const getRetryDelay = (error: Error, attempt: number, config: Required<RetryConfig>): number => {
  // Respect server-specified Retry-After for rate limit errors
  if (error instanceof RateLimitError && error.retryAfterSeconds != null) {
    return error.retryAfterSeconds * 1000;
  }

  // Default: exponential backoff with jitter
  const delay = Math.min(config.baseDelay * Math.pow(config.multiplier, attempt), config.maxDelay);
  // Add jitter (±25%) to prevent thundering herd
  return delay * (0.75 + Math.random() * 0.5);
};

export const withRetry = async <T>(
  fn: () => Promise<T>,
  options?: RetryConfig,
  onRetry?: (attempt: number, error: Error, nextDelay: number) => void,
): Promise<T> => {
  const config: Required<RetryConfig> = { ...DEFAULT_RETRY, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (isNonRetryableError(error)) {
        throw error;
      }

      if (attempt < config.maxRetries) {
        const delay = getRetryDelay(lastError, attempt, config);

        onRetry?.(attempt + 1, lastError, delay);
        await sleep(delay);
      }
    }
  }

  throw lastError!;
};
