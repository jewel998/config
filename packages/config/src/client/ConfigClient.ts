import { withRetry } from "../retry/RetryEngine";
import type {
  CacheStorage,
  ConfigClient,
  ConfigEventCallback,
  ConfigEventType,
  ConfigFetcher,
  EventEmitterInterface,
  FetchGranularity,
  RetryConfig,
} from "../types";
import { DEFAULT_CACHE_TTL } from "../types";

export interface ConfigClientInternals {
  data: Record<string, unknown>;
  cache: CacheStorage;
  fetcher: ConfigFetcher;
  events: EventEmitterInterface;
  retry: Required<RetryConfig>;
  granularity: FetchGranularity;
  isDeferred: boolean;
}

export const buildConfigClient = (
  internals: ConfigClientInternals,
): ConfigClient => {
  const { cache, fetcher, events, retry, granularity, isDeferred } = internals;
  let data = { ...internals.data };
  let batchFetchTriggered = false;

  const triggerDeferredFetch = (): void => {
    if (!isDeferred || batchFetchTriggered) {
      return;
    }

    if (granularity === "batch") {
      batchFetchTriggered = true;
      void (async () => {
        try {
          const result = await withRetry(() => fetcher.fetchAll(), retry);
          cache.set("__all__", result, DEFAULT_CACHE_TTL);
          for (const [key, value] of Object.entries(result)) {
            cache.set(key, value, DEFAULT_CACHE_TTL);
          }
          data = { ...data, ...result };
          events.emit("updated", {
            keys: Object.keys(result),
            source: "background",
          });
        } catch (error) {
          events.emit("fetchError", {
            error: error as Error,
            retryCount: retry.maxRetries,
            willRetry: false,
          });
        }
      })();
    }
  };

  const triggerProjectedFetch = (key: string): void => {
    if (!isDeferred || granularity !== "projected") {
      return;
    }

    void (async () => {
      try {
        const result = await fetcher.fetchKeys([key]);
        for (const [k, v] of Object.entries(result)) {
          cache.set(k, v, DEFAULT_CACHE_TTL);
          data[k] = v;
        }
        events.emit("updated", {
          keys: Object.keys(result),
          source: "background",
        });
      } catch (error) {
        events.emit("fetchError", {
          error: error as Error,
          retryCount: retry.maxRetries,
          willRetry: false,
        });
      }
    })();
  };

  const client: ConfigClient = {
    getValue<T = unknown>(key: string, defaultValue?: T): T | undefined {
      // Check live data first
      if (key in data) {
        return data[key] as T;
      }

      // Check cache
      const cached = cache.get<T>(key);
      if (cached !== undefined) {
        data[key] = cached;
        return cached;
      }

      // Trigger deferred fetch if applicable
      if (isDeferred) {
        triggerDeferredFetch();
        triggerProjectedFetch(key);
      }

      return defaultValue as T | undefined;
    },

    getFlag(key: string): boolean {
      const value = client.getValue<boolean>(key);
      return value === true;
    },

    getAll(): Record<string, unknown> {
      // Check cache for full batch
      const cached = cache.get<Record<string, unknown>>("__all__");
      if (cached) {
        data = { ...data, ...cached };
        return { ...data };
      }

      // Trigger deferred fetch if applicable
      if (isDeferred) {
        triggerDeferredFetch();
      }

      return { ...data };
    },

    async refresh(): Promise<void> {
      try {
        const result = await withRetry(() => fetcher.fetchAll(), retry);
        cache.set("__all__", result, DEFAULT_CACHE_TTL);
        for (const [key, value] of Object.entries(result)) {
          cache.set(key, value, DEFAULT_CACHE_TTL);
        }
        data = { ...data, ...result };
        events.emit("updated", {
          keys: Object.keys(result),
          source: "refresh",
        });
      } catch (error) {
        events.emit("fetchError", {
          error: error as Error,
          retryCount: retry.maxRetries,
          willRetry: false,
        });
        throw error;
      }
    },

    on<E extends ConfigEventType>(
      event: E,
      callback: ConfigEventCallback<E>,
    ): void {
      events.on(event, callback);
    },

    off<E extends ConfigEventType>(
      event: E,
      callback: ConfigEventCallback<E>,
    ): void {
      events.off(event, callback);
    },
  };

  return client;
};
