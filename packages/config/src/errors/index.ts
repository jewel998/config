export type ConfigErrorCode =
  | "MISSING_CLIENT_ID"
  | "AUTHENTICATION_FAILED"
  | "INITIALIZATION_FAILED"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "REVOKED"
  | "NETWORK_ERROR"
  | "BAD_REQUEST"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "PAYLOAD_TOO_LARGE"
  | "CONFLICT"
  | "SERVER_ERROR";

export class ConfigError extends Error {
  override name = "ConfigError";

  constructor(
    message: string,
    public readonly code: ConfigErrorCode,
  ) {
    super(message);
  }
}

export class RateLimitError extends ConfigError {
  /** Seconds to wait before retrying (from server Retry-After header) */
  public readonly retryAfterSeconds: number | undefined;

  constructor(message: string, retryAfterSeconds?: number) {
    super(message, "RATE_LIMITED");
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class InitializationError extends ConfigError {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message, "INITIALIZATION_FAILED");
    this.name = "InitializationError";
  }
}

export class TimeoutError extends ConfigError {
  constructor(timeoutMs: number) {
    super(`Config initialization timed out after ${timeoutMs}ms`, "TIMEOUT");
    this.name = "TimeoutError";
  }
}

export class AuthenticationError extends ConfigError {
  constructor(message: string) {
    super(message, "AUTHENTICATION_FAILED");
    this.name = "AuthenticationError";
  }
}

// ─── SDK-level errors for initConfig / get() ──────────────────

/**
 * Error type passed to onError and thrown by get() on failure.
 *
 * type:
 *   TIMEOUT       — get() waited longer than global timeout, no default provided
 *   FETCH_FAILED  — network error or non-2xx response during any tier fetch
 *   KEY_NOT_FOUND — key does not exist in the project
 *   AUTH          — 401/403 from the API (circuit breaker opens)
 *   RATE_LIMITED  — 429 from the API
 */
export type SdkErrorType = "TIMEOUT" | "FETCH_FAILED" | "KEY_NOT_FOUND" | "AUTH" | "RATE_LIMITED";

export class SdkError extends Error {
  override name = "SdkError";

  constructor(
    public readonly type: SdkErrorType,
    message: string,
    public readonly key?: string,
    public readonly cause?: Error,
  ) {
    super(message);
  }
}
