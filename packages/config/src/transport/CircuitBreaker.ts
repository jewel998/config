/**
 * Circuit Breaker — prevents repeated requests to a failing endpoint.
 *
 * States:
 * - CLOSED: Normal operation, all requests flow through.
 * - OPEN: A fatal error occurred; requests are blocked until cooldown expires.
 * - HALF_OPEN: Cooldown expired; one probe request is allowed through.
 *
 * On success in HALF_OPEN, the circuit transitions back to CLOSED.
 * On a fatal failure (status code in the fatalCodes set), the circuit opens.
 */

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerConfig {
  /** HTTP status codes that trigger the circuit to open */
  fatalCodes: Set<number>;
  /** Cooldown in ms before transitioning from OPEN to HALF_OPEN */
  cooldownMs: number;
}

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private openedAt = 0;
  private lastError: Error | null = null;

  constructor(private config: CircuitBreakerConfig) {}

  /** Current circuit state */
  get currentState(): CircuitState {
    return this.state;
  }

  /**
   * Check if a request should be allowed through.
   * If the circuit is OPEN and the cooldown has passed, transitions to HALF_OPEN.
   *
   * @returns true if the request can proceed, false if blocked
   */
  canExecute(): boolean {
    if (this.state === "CLOSED" || this.state === "HALF_OPEN") {
      return true;
    }

    // OPEN state — check cooldown
    if (Date.now() - this.openedAt >= this.config.cooldownMs) {
      this.state = "HALF_OPEN";
      return true;
    }

    return false;
  }

  /**
   * Record a successful response.
   * Closes the circuit if currently in HALF_OPEN state.
   */
  recordSuccess(): void {
    if (this.state === "HALF_OPEN") {
      this.state = "CLOSED";
      this.lastError = null;
    }
  }

  /**
   * Record a failed response.
   * Opens the circuit if the status code is in the fatal set.
   *
   * @param statusCode - HTTP status code of the failed response
   * @param error - The error to cache for re-throwing while the circuit is open
   */
  recordFailure(statusCode: number, error: Error): void {
    if (this.config.fatalCodes.has(statusCode)) {
      this.state = "OPEN";
      this.openedAt = Date.now();
      this.lastError = error;
    }
  }

  /**
   * Get the cached fatal error (for throwing without making a network call).
   * Returns null if no fatal error has been recorded.
   */
  getCachedError(): Error | null {
    return this.lastError;
  }

  /** Reset the circuit breaker to CLOSED state, clearing any cached error. */
  reset(): void {
    this.state = "CLOSED";
    this.openedAt = 0;
    this.lastError = null;
  }
}
