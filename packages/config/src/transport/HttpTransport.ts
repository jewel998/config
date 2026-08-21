/// <reference lib="dom" />

import { AuthenticationError, ConfigError } from "../errors/index.js";
import type { EvaluationContext } from "../plugins/types.js";
import type { HttpTransport } from "../types.js";

export interface TransportConfig {
  baseUrl: string;
  clientId: string;
  /** Internal mode (auto-detected from key prefix). Controls whether context is sent. */
  evaluationMode?: "server" | "client";
  getContext?: () => EvaluationContext;
}

/**
 * Circuit breaker states:
 * - CLOSED: normal operation, requests flow through
 * - OPEN: fatal error occurred, requests are blocked
 * - HALF_OPEN: cooldown expired, allow one probe request
 */
type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

/** Errors that should permanently stop retrying (circuit opens) */
const FATAL_STATUS_CODES = new Set([400, 401, 403]);

/** Cooldown before trying again after a fatal error (5 minutes) */
const CIRCUIT_COOLDOWN_MS = 5 * 60 * 1000;

export const createHttpTransport = (config: TransportConfig): HttpTransport => {
  let circuitState: CircuitState = "CLOSED";
  let circuitOpenedAt = 0;
  let lastFatalError: ConfigError | null = null;

  return {
    async request<T>(
      endpoint: string,
      body?: Record<string, unknown>,
    ): Promise<T> {
      // ── Circuit breaker check ──────────────────────────────
      if (circuitState === "OPEN") {
        // Check if cooldown has passed → transition to HALF_OPEN
        if (Date.now() - circuitOpenedAt >= CIRCUIT_COOLDOWN_MS) {
          circuitState = "HALF_OPEN";
        } else {
          // Still in cooldown — throw the cached error without hitting the network
          throw (
            lastFatalError ??
            new ConfigError(
              "API circuit breaker is open — requests are blocked due to a previous fatal error",
              "FORBIDDEN",
            )
          );
        }
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
          case 429:
            error = new ConfigError(message, "RATE_LIMITED");
            break;
          case 500:
          case 502:
          case 503:
          case 504:
            error = new ConfigError(message, "SERVER_ERROR");
            break;
          default:
            error = new ConfigError(message, "NETWORK_ERROR");
        }

        // ── Open circuit on fatal errors ────────────────────
        if (FATAL_STATUS_CODES.has(response.status)) {
          circuitState = "OPEN";
          circuitOpenedAt = Date.now();
          lastFatalError = error;
        }

        // ── Close circuit on success in HALF_OPEN state ─────
        // (handled below after successful response)

        throw error;
      }

      // ── Success: close the circuit if it was half-open ────
      if (circuitState === "HALF_OPEN") {
        circuitState = "CLOSED";
        lastFatalError = null;
      }

      return (await response.json()) as T;
    },
  };
};
