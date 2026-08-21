import { withRetry } from "../retry/RetryEngine.js";
import type { LoadingContext, LoadingResult } from "../types.js";
import { DEFAULT_CACHE_TTL } from "../types.js";

const scheduleBackgroundFetch = (ctx: LoadingContext): void => {
  const doFetch = async () => {
    try {
      const data = await withRetry(() => ctx.fetcher.fetchAll(), ctx.retry);

      ctx.cache.set("__all__", data, DEFAULT_CACHE_TTL);
      for (const [key, value] of Object.entries(data)) {
        ctx.cache.set(key, value, DEFAULT_CACHE_TTL);
      }

      ctx.events.emit("updated", {
        keys: Object.keys(data),
        source: "background",
      });
    } catch (error) {
      ctx.events.emit("fetchError", {
        error: error as Error,
        retryCount: ctx.retry.maxRetries,
        willRetry: false,
      });
    }
  };

  // Non-blocking — fire and forget
  void doFetch();
};

export const executeOptimistic = (ctx: LoadingContext): LoadingResult => {
  // Synchronously read from cache
  const cached = ctx.cache.get<Record<string, unknown>>("__all__");
  const initialData = cached ?? {};

  // Schedule background fetch
  scheduleBackgroundFetch(ctx);

  return { initialData, status: "ready" };
};
