import { TimeoutError } from "../errors/index.js";
import { withRetry } from "../retry/RetryEngine.js";
import type { LoadingContext, LoadingResult } from "../types.js";
import { DEFAULT_CACHE_TTL } from "../types.js";

export const executePessimistic = async (
  ctx: LoadingContext,
): Promise<LoadingResult> => {
  const fetchPromise = withRetry(() => ctx.fetcher.fetchAll(), ctx.retry);

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new TimeoutError(ctx.timeout)), ctx.timeout);
  });

  try {
    const data = await Promise.race([fetchPromise, timeoutPromise]);

    ctx.cache.set("__all__", data, DEFAULT_CACHE_TTL);
    for (const [key, value] of Object.entries(data)) {
      ctx.cache.set(key, value, DEFAULT_CACHE_TTL);
    }

    return { initialData: data, status: "ready" };
  } catch (error) {
    // On failure: fall back to cached data instead of throwing.
    // This prevents SDK errors from hitting the consumer's error tracking.
    // The error is communicated via the "fetchError" event instead.
    ctx.events.emit("fetchError", {
      error: error as Error,
      retryCount: ctx.retry.maxRetries,
      willRetry: false,
    });

    // Try cache as fallback
    const cached = ctx.cache.get<Record<string, unknown>>("__all__");
    return { initialData: cached ?? {}, status: "ready" };
  }
};
