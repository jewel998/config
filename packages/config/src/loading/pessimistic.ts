import { InitializationError, TimeoutError } from "../errors/index";
import { withRetry } from "../retry/RetryEngine";
import type { LoadingContext, LoadingResult } from "../types";
import { DEFAULT_CACHE_TTL } from "../types";

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
    if (error instanceof TimeoutError) {
      throw error;
    }
    throw new InitializationError(
      "Failed to fetch config after all retries",
      error as Error,
    );
  }
};
