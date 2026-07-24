/// <reference lib="dom" />

import { AuthenticationError, ConfigError } from "../errors/index";
import type { HttpTransport } from "../types";

export interface TransportConfig {
  baseUrl: string;
  clientId: string;
}

export const createHttpTransport = (
  config: TransportConfig,
): HttpTransport => ({
  async request<T>(
    endpoint: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${config.baseUrl}/${endpoint}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          clientId: config.clientId,
          ...body,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const errorData = errorBody as {
        error?: { code?: string; message?: string };
      };
      const code = errorData.error?.code ?? "NETWORK_ERROR";
      const message = errorData.error?.message ?? `HTTP ${response.status}`;

      if (response.status === 401) {
        throw new AuthenticationError(message);
      }

      if (response.status === 429) {
        throw new ConfigError(message, "RATE_LIMITED");
      }

      throw new ConfigError(message, code as "NETWORK_ERROR");
    }

    return (await response.json()) as T;
  },
});
