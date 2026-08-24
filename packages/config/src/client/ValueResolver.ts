/**
 * ValueResolver — resolves config values through the plugin evaluation pipeline.
 *
 * Responsibilities:
 * - Looking up raw flag data from in-memory data or cache
 * - Running the evaluation pipeline when plugins are registered
 * - Handling consent-aware mode (GDPR compliance)
 * - Providing backward-compatible behavior when no plugins are present
 */

import { evaluatePipeline } from "../plugins/evaluatePipeline.js";
import type { ConfigFlagData } from "../plugins/models.js";
import type { EvaluationContext, EvaluationPlugin } from "../plugins/types.js";
import type { CacheStorage, EventEmitterInterface } from "../types.js";

export class ValueResolver {
  constructor(
    private plugins: EvaluationPlugin[],
    private data: Record<string, unknown>,
    private cache: CacheStorage,
    private events: EventEmitterInterface,
  ) {}

  /**
   * Resolve a value through the plugin pipeline or via direct lookup.
   *
   * @param key - Config key to resolve
   * @param context - Current evaluation context
   * @param defaultValue - Fallback value if key is not found or no plugin resolves
   * @param consentAware - If true, blocks evaluation unless consentGranted is true
   * @returns The resolved value, or defaultValue if unresolved
   */
  resolve<T>(
    key: string,
    context: EvaluationContext,
    defaultValue?: T,
    consentAware = false,
  ): T | undefined {
    if (this.plugins.length > 0) {
      return this.resolveWithPlugins(key, context, defaultValue, consentAware);
    }

    // No plugins — use existing behavior (backward compat)
    return this.resolveSimple<T>(key, defaultValue);
  }

  /**
   * Simple resolution without plugins — checks data then cache.
   * Returns undefined (or defaultValue) if the key is missing entirely.
   */
  resolveSimple<T>(key: string, defaultValue?: T): T | undefined {
    if (key in this.data) {
      return this.data[key] as T;
    }

    const cached = this.cache.get<T>(key);
    if (cached !== undefined) {
      this.data[key] = cached;
      return cached;
    }

    return defaultValue as T | undefined;
  }

  /**
   * Resolution with plugin pipeline — evaluates flag data through registered plugins.
   */
  private resolveWithPlugins<T>(
    key: string,
    context: EvaluationContext,
    defaultValue?: T,
    consentAware = false,
  ): T | undefined {
    // Consent-aware mode: if enabled and consent not granted, return default
    if (consentAware && context.consentGranted !== true) {
      return defaultValue as T | undefined;
    }

    // Get raw flag data from data store or cache
    const rawValue = this.data[key] ?? this.cache.get(key);

    if (rawValue === undefined) {
      return defaultValue as T | undefined;
    }

    // Build a ConfigFlagData object from the raw data
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
        const flagData = this.data[flagKey] ?? this.cache.get(flagKey);
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
        return evaluatePipeline(this.plugins, innerFlag, ctx, helpers);
      },
      emitError: (message: string): void => {
        this.events.emit("fetchError", {
          error: new Error(message),
          retryCount: 0,
          willRetry: false,
        });
      },
      now: (): number => Date.now(),
    };

    const result = evaluatePipeline(this.plugins, flag, context, helpers);
    return (result !== undefined ? result : defaultValue) as T | undefined;
  }

  /** Whether data is missing for a given key (triggers deferred fetch) */
  isMissing(key: string): boolean {
    return !(key in this.data) && this.cache.get(key) === undefined;
  }
}

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
function inferValueType(value: unknown): "string" | "number" | "boolean" | "json" {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (typeof value === "string") return "string";
  return "json";
}
