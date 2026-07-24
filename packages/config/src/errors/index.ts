export type ConfigErrorCode =
  | "MISSING_CLIENT_ID"
  | "AUTHENTICATION_FAILED"
  | "INITIALIZATION_FAILED"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "REVOKED"
  | "NETWORK_ERROR";

export class ConfigError extends Error {
  override name = "ConfigError";

  constructor(
    message: string,
    public readonly code: ConfigErrorCode,
  ) {
    super(message);
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
