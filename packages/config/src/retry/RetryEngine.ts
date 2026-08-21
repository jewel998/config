import { AuthenticationError, ConfigError } from "../errors/index.js";
import type { RetryConfig } from "../types.js";
import { DEFAULT_RETRY } from "../types.js";

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const isNonRetryableError = (error: unknown): boolean => {
  if (error instanceof AuthenticationError) {
    return true;
  }
  if (error instanceof ConfigError && error.code === "REVOKED") {
    return true;
  }
  return false;
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
        const delay = Math.min(
          config.baseDelay * Math.pow(config.multiplier, attempt),
          config.maxDelay,
        );
        // Add jitter (±25%) to prevent thundering herd
        const jitter = delay * (0.75 + Math.random() * 0.5);

        onRetry?.(attempt + 1, lastError, jitter);
        await sleep(jitter);
      }
    }
  }

  throw lastError!;
};
