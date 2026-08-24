/// <reference lib="dom" />

import {
  AuthenticationError,
  ConfigError,
  RateLimitError,
} from "../errors/index.js";
import type { EvaluationContext } from "../plugins/types.js";
import type { HttpTransport } from "../types.js";
import { CircuitBreaker } from "./CircuitBreaker.js";

export interface TransportConfig {
  baseUrl: string;
  clientId: string;
  /** Internal mode (auto-detected from key prefix). Controls whether context is sent. */
  evaluationMode?: "server" | "client";
  getContext?: () => EvaluationContext;
}

/** Errors that should permanently stop retrying (circuit opens) */
const FATAL_STATUS_CODES = new Set([400, 401, 403]);

/** Cooldown before trying again after a fatal error (5 minutes) */
const CIRCUIT_COOLDOWN_MS = 5 * 60 * 1000;

export const createHttpTransport = (config: TransportConfig): HttpTransport => {
  const circuitBreaker = new CircuitBreaker({
    fatalCodes: FATAL_STATUS_CODES,
    cooldownMs: CIRCUIT_COOLDOWN_MS,
  });

  return {
    async request<T>(
      endpoint: string,
      body?: Record<string, unknown>,
    ): Promise<T> {
      // ── Circuit breaker check ──────────────────────────────
      if (!circuitBreaker.canExecute()) {
        throw (
          circuitBreaker.getCachedError() ??
          new ConfigError(
            "API circuit breaker is open — requests are blocked due to a previous fatal error",
            "FORBIDDEN",
          )
        );
      }

      const url = `${config.baseUrl}/${endpoint}`;

      const requestData: Record<string, unknown> = {
        clientId: config.clientId,
        ...body,
      };

      // In server mode (cid_ key), include the current context for server-side evaluation
      if (config.evaluationMode === "server" && config.getContext) {
        const ctx = config.getContext();
        if (ctx && (ctx.userId || ctx.attributes)) {
          requestData.context = {
            ...(ctx.userId && { userId: ctx.userId }),
            ...(ctx.attributes && { attributes: ctx.attributes }),
          };
        }
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: requestData,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const errorData = errorBody as {
          error?: { code?: string; message?: string };
        };
        const message = errorData.error?.message ?? `HTTP ${response.status}`;

        let error: ConfigError;

        switch (response.status) {
          case 400:
            error = new ConfigError(message, "BAD_REQUEST");
            break;
          case 401:
            error = new AuthenticationError(message);
            break;
          case 403:
            error = new ConfigError(message, "FORBIDDEN");
            break;
          case 404:
            error = new ConfigError(message, "NOT_FOUND");
            break;
          case 405:
            error = new ConfigError(message, "METHOD_NOT_ALLOWED");
            break;
          case 409:
            error = new ConfigError(message, "CONFLICT");
            break;
          case 413:
            error = new ConfigError(message, "PAYLOAD_TOO_LARGE");
            break;
          case 429: {
            const retryAfterHeader = response.headers.get("Retry-After");
            const retryAfterSeconds = retryAfterHeader
              ? parseInt(retryAfterHeader, 10)
              : undefined;
            error = new RateLimitError(
              message,
              Number.isFinite(retryAfterSeconds)
                ? retryAfterSeconds
                : undefined,
            );
            break;
          }
          case 500:
          case 502:
          case 503:
          case 504:
            error = new ConfigError(message, "SERVER_ERROR");
            break;
          default:
            error = new ConfigError(message, "NETWORK_ERROR");
        }

        // Record failure in circuit breaker
        circuitBreaker.recordFailure(response.status, error);

        throw error;
      }

      // Success: record in circuit breaker (closes if HALF_OPEN)
      circuitBreaker.recordSuccess();

      return (await response.json()) as T;
    },
  };
};
