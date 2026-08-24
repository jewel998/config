import type { EvaluationContext, EvaluationPlugin } from "../plugins/types.js";
import { withRetry } from "../retry/RetryEngine.js";
import type {
  CacheStorage,
  ConfigClient,
  ConfigEventCallback,
  ConfigEventType,
  ConfigFetcher,
  EvaluationMode,
  EventEmitterInterface,
  FetchGranularity,
  RetryConfig,
} from "../types.js";
import { DEFAULT_CACHE_TTL } from "../types.js";
import { RefreshManager } from "./RefreshManager.js";
import { ValueResolver } from "./ValueResolver.js";

export interface ConfigClientInternals {
  data: Record<string, unknown>;
  cache: CacheStorage;
  fetcher: ConfigFetcher;
  events: EventEmitterInterface;
  retry: Required<RetryConfig>;
  granularity: FetchGranularity;
  isDeferred: boolean;
  plugins?: EvaluationPlugin[];
  context?: EvaluationContext;
  consentAware?: boolean;
  evaluationMode?: EvaluationMode;
  onContextChange?: (ctx: EvaluationContext) => void;
}

const MIN_FETCH_INTERVAL = 30_000; // Don't re-fetch within 30s
const CONTEXT_DEBOUNCE_MS = 100; // Batch rapid setContext calls

export const buildConfigClient = (internals: ConfigClientInternals): ConfigClient => {
  const { cache, fetcher, events, retry, granularity, isDeferred } = internals;
  const plugins = internals.plugins ?? [];
  let evalContext: EvaluationContext = internals.context ?? {};
  const consentAware = internals.consentAware ?? false;
  const evaluationMode = internals.evaluationMode ?? "server";
  const onContextChange = internals.onContextChange;
  let data = { ...internals.data };
  let batchFetchTriggered = false;

  // ── Debouncing ──
  let contextDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Extracted components ──
  const refreshManager = new RefreshManager({
    fetcher,
    cache,
    events,
    retry,
    minFetchInterval: MIN_FETCH_INTERVAL,
  });

  const valueResolver = new ValueResolver(plugins, data, cache, events);

  // ── Deferred fetch helpers ──
  const triggerDeferredFetch = (): void => {
    if (!isDeferred || batchFetchTriggered) return;

    if (granularity === "batch") {
      batchFetchTriggered = true;
      void (async () => {
        try {
          const result = await withRetry(() => fetcher.fetchAll(), retry);
          cache.set("__all__", result, DEFAULT_CACHE_TTL);
          for (const [key, value] of Object.entries(result)) {
            cache.set(key, value, DEFAULT_CACHE_TTL);
          }
          Object.assign(data, result);
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
    if (!isDeferred || granularity !== "projected") return;

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
      // Delegate to ValueResolver for plugin-based or simple resolution
      if (plugins.length > 0) {
        // Check if data is missing and trigger deferred fetch
        if (valueResolver.isMissing(key) && isDeferred) {
          triggerDeferredFetch();
          triggerProjectedFetch(key);
          return defaultValue as T | undefined;
        }
        return valueResolver.resolve<T>(key, evalContext, defaultValue, consentAware);
      }

      // No plugins — use simple resolution via ValueResolver
      const result = valueResolver.resolveSimple<T>(key, defaultValue);
      if (result !== undefined) return result;

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
      const cached = cache.get<Record<string, unknown>>("__all__");
      if (cached) {
        Object.assign(data, cached);
        return { ...data };
      }

      if (isDeferred) {
        triggerDeferredFetch();
      }

      return { ...data };
    },

    async refresh(): Promise<void> {
      await refreshManager.refresh(data);
    },

    on<E extends ConfigEventType>(event: E, callback: ConfigEventCallback<E>): void {
      events.on(event, callback);
    },

    off<E extends ConfigEventType>(event: E, callback: ConfigEventCallback<E>): void {
      events.off(event, callback);
    },

    setContext(newContext: EvaluationContext): void {
      evalContext = { ...newContext };
      if (onContextChange) {
        onContextChange(evalContext);
      }
      // In server mode, context change means we need fresh resolved values.
      // Debounce rapid setContext calls (e.g., form typing, navigation)
      if (evaluationMode === "server") {
        if (contextDebounceTimer) clearTimeout(contextDebounceTimer);
        contextDebounceTimer = setTimeout(() => {
          contextDebounceTimer = null;
          if (refreshManager.isRecent) return;
          void client.refresh();
        }, CONTEXT_DEBOUNCE_MS);
      }
    },

    destroy(): void {
      if (contextDebounceTimer) {
        clearTimeout(contextDebounceTimer);
        contextDebounceTimer = null;
      }
      events.removeAllListeners();
    },
  };

  return client;
};
