/// <reference lib="dom" />

import { API_ENDPOINTS, HTTP_CONSTANTS } from "../constants.js";
import { AuthenticationError, ConfigError, RateLimitError } from "../errors/index.js";
import type { EvaluationContext } from "../plugins/types.js";
import type { HttpTransport } from "../types.js";
import { warnForFetchFailure, warnIfCspBlocksUrl } from "./browserDiagnostics.js";
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
  warnIfCspBlocksUrl(config.baseUrl);

  const circuitBreaker = new CircuitBreaker({
    fatalCodes: FATAL_STATUS_CODES,
    cooldownMs: CIRCUIT_COOLDOWN_MS,
  });
  let versionCache: { etag: string; body: unknown } | undefined;

  return {
    async request<T>(endpoint: string, body?: Record<string, unknown>): Promise<T> {
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

      // Client keys (cid_) use POST with body (server-side evaluation needs context).
      // Server keys (svr_) use GET with query params (fetches full flag data).
      const isServerKey = config.clientId.startsWith("svr_");
      const isVersionRequest = endpoint === API_ENDPOINTS.version;
      const cachedVersion = isVersionRequest ? versionCache : undefined;

      let response: Response;

      try {
        if (isServerKey) {
          // GET request — clientId as query param
          const params = new URLSearchParams({ clientId: config.clientId });
          if (body?.keys && Array.isArray(body.keys)) {
            params.set("keys", (body.keys as string[]).join(","));
          }
          response = await fetch(`${url}?${params.toString()}`, {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept: HTTP_CONSTANTS.jsonAccept,
              "Cache-Control": "no-cache",
            },
          });
        } else {
          // POST request — full body with context
          response = await fetch(url, {
            method: "POST",
            cache: "no-store",
            headers: {
              "Content-Type": HTTP_CONSTANTS.jsonContentType,
              "Cache-Control": "no-cache",
            },
            body: JSON.stringify({ data: requestData }),
          });
        }
      } catch (error) {
        warnForFetchFailure(url, error);
        throw error;
      }

      // A conditional version request has no response body on 304. Reuse the
      // last successful body so callers never attempt to parse an empty body.
      if (response.status === 304 && cachedVersion) {
        circuitBreaker.recordSuccess();
        return cachedVersion.body as T;
      }

      if (response.status === 304) {
        const error = new ConfigError(
          "Version endpoint returned 304 but no cached response is available",
          "NETWORK_ERROR",
        );
        circuitBreaker.recordFailure(response.status, error);
        throw error;
      }

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
            const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
            error = new RateLimitError(
              message,
              Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
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

      const responseBody = (await response.json()) as T;
      if (isVersionRequest) {
        const etag = response.headers.get(HTTP_CONSTANTS.etagHeader);
        if (etag) versionCache = { etag, body: responseBody };
      }

      return responseBody;
    },
  };
};
