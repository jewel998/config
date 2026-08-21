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

export const createHttpTransport = (
  config: TransportConfig,
): HttpTransport => ({
  async request<T>(
    endpoint: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
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

      switch (response.status) {
        case 400:
          throw new ConfigError(message, "BAD_REQUEST");
        case 401:
          throw new AuthenticationError(message);
        case 403:
          throw new ConfigError(message, "FORBIDDEN");
        case 404:
          throw new ConfigError(message, "NOT_FOUND");
        case 405:
          throw new ConfigError(message, "METHOD_NOT_ALLOWED");
        case 409:
          throw new ConfigError(message, "CONFLICT");
        case 413:
          throw new ConfigError(message, "PAYLOAD_TOO_LARGE");
        case 429:
          throw new ConfigError(message, "RATE_LIMITED");
        case 500:
        case 502:
        case 503:
        case 504:
          throw new ConfigError(message, "SERVER_ERROR");
        default:
          throw new ConfigError(message, "NETWORK_ERROR");
      }
    }

    return (await response.json()) as T;
  },
});
