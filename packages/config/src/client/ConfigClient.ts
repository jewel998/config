import { withRetry } from "../retry/RetryEngine";
import type { EvaluationContext, EvaluationPlugin } from "../plugins/types.js";
import type { ConfigFlagData } from "../plugins/models.js";
import { evaluatePipeline } from "../plugins/evaluatePipeline.js";
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
  plugins?: EvaluationPlugin[];
  context?: EvaluationContext;
  consentAware?: boolean;
}

export const buildConfigClient = (
  internals: ConfigClientInternals,
): ConfigClient => {
  const { cache, fetcher, events, retry, granularity, isDeferred } = internals;
  const plugins = internals.plugins ?? [];
  let evalContext: EvaluationContext = internals.context ?? {};
  const consentAware = internals.consentAware ?? false;
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
      // If plugins are registered, use the evaluation pipeline
      if (plugins.length > 0) {
        // Consent-aware mode: if enabled and consent not granted, return default immediately
        if (consentAware && evalContext.consentGranted !== true) {
          return defaultValue as T | undefined;
        }

        // Get raw flag data from cache/data store
        const rawValue = data[key] ?? cache.get(key);

        // If we have no data at all for this key, trigger deferred fetch and return default
        if (rawValue === undefined) {
          if (isDeferred) {
            triggerDeferredFetch();
            triggerProjectedFetch(key);
          }
          return defaultValue as T | undefined;
        }

        // Build a ConfigFlagData object from the raw data
        // If the data is already a full ConfigFlagData object (has 'key' and 'value' fields), use it
        // Otherwise, wrap the raw value as a simple flag
        const flag: ConfigFlagData = isConfigFlagData(rawValue)
          ? rawValue
          : {
              key,
              value: rawValue,
              valueType: inferValueType(rawValue),
              version: "0",
              lifecycleState: "active",
            };

        // Build pipeline helpers
        const helpers = {
          evaluateFlag: (flagKey: string, ctx: EvaluationContext): unknown => {
            // Recursive evaluation for prerequisites
            const flagData = data[flagKey] ?? cache.get(flagKey);
            if (flagData === undefined) return undefined;
            const innerFlag: ConfigFlagData = isConfigFlagData(flagData)
              ? flagData
              : {
                  key: flagKey,
                  value: flagData,
                  valueType: inferValueType(flagData),
                  version: "0",
                  lifecycleState: "active",
                };
            return evaluatePipeline(plugins, innerFlag, ctx, helpers);
          },
          emitError: (message: string): void => {
            events.emit("fetchError", {
              error: new Error(message),
              retryCount: 0,
              willRetry: false,
            });
          },
          now: (): number => Date.now(),
        };

        const result = evaluatePipeline(plugins, flag, evalContext, helpers);
        return (result !== undefined ? result : defaultValue) as T | undefined;
      }

      // No plugins — use existing behavior (backward compat)
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

    setContext(newContext: EvaluationContext): void {
      evalContext = { ...newContext };
    },
  };

  return client;
};

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

/** Type guard: checks if a value looks like a full ConfigFlagData object */
function isConfigFlagData(value: unknown): value is ConfigFlagData {
  return (
    typeof value === "object" &&
    value !== null &&
    "key" in value &&
    "value" in value &&
    "lifecycleState" in value
  );
}

/** Infer a valueType string from a raw value */
function inferValueType(
  value: unknown,
): "string" | "number" | "boolean" | "json" {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (typeof value === "string") return "string";
  return "json";
}
