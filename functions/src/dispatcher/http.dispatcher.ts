import type { DispatchResult, WebhookDispatcher } from "../types";

/**
 * Default HTTP dispatcher (Adapter pattern).
 * Uses fetch with AbortController for timeout handling.
 * Swap this for a queue-based dispatcher (e.g., Cloud Tasks) without
 * changing any calling code.
 */
export const httpDispatcher: WebhookDispatcher = {
  async dispatch(url, payload, options): Promise<DispatchResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeout);
    const start = Date.now();

    try {
      const response = await fetch(url, {
        method: options.method,
        headers: options.headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      return {
        success: response.ok,
        httpStatus: response.status,
        duration: Date.now() - start,
        error: response.ok ? null : `HTTP ${response.status}`,
      };
    } catch (err) {
      const isAbort = err instanceof Error && err.name === "AbortError";
      return {
        success: false,
        httpStatus: null,
        duration: Date.now() - start,
        error: isAbort ? "Request timed out" : err instanceof Error ? err.message : "Unknown error",
      };
    } finally {
      clearTimeout(timer);
    }
  },
};
