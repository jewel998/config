// ═══════════════════════════════════════════════════════════════
// initConfig — Primary SDK entry point
//
// Usage:
//   const flags = initConfig({
//     clientId: "cid_xxx",
//     defaults: { "feature.dark_mode": false, "app.upload_limit": 50 },
//     context: autoContext({ userId: "user_123", plan: "pro" }),
//   });
//
//   flags.get("feature.dark_mode") // → false (instant, from defaults)
//   // ...API responds...
//   flags.get("feature.dark_mode") // → true (resolved from server)
// ═══════════════════════════════════════════════════════════════

import { createConfig } from "./createConfig";
import type {
  ConfigClient,
  ConfigEventCallback,
  ConfigEventType,
  CreateConfigOptions,
} from "./types";
import type { EvaluationContext } from "./plugins/types.js";

export interface InitConfigOptions {
  /** Required. API key from the portal (cid_ for client, svr_ for server). */
  clientId: string;

  /**
   * Default/fallback values returned instantly before the API responds.
   * Keys are flag names, values are what your app uses immediately (optimistic).
   */
  defaults?: Record<string, unknown>;

  /** User context for targeting evaluation. Use autoContext() to auto-detect browser info. */
  context?: EvaluationContext;

  /** Override the API base URL (for testing or custom deployments). */
  baseUrl?: string;
}

export interface Flags {
  /** Get a flag value. Returns the default until the API responds, then the resolved value. */
  get<T = unknown>(key: string): T;

  /** Get a boolean flag. Returns false if the flag doesn't exist. */
  flag(key: string): boolean;

  /** Get all resolved flag values. */
  all(): Record<string, unknown>;

  /** Update user context. Triggers a re-fetch in client-key mode. */
  setContext(context: EvaluationContext): void;

  /** Force re-fetch from the API. */
  refresh(): Promise<void>;

  /** Subscribe to events: "ready", "updated", "fetchError" */
  on<E extends ConfigEventType>(event: E, cb: ConfigEventCallback<E>): void;

  /** Unsubscribe from events. */
  off<E extends ConfigEventType>(event: E, cb: ConfigEventCallback<E>): void;
}

/**
 * Initialize the feature flags SDK.
 *
 * Returns a Flags instance that immediately serves default values,
 * then resolves to real values from the API in the background.
 *
 * @example
 * ```ts
 * const flags = initConfig({
 *   clientId: "cid_xxx",
 *   defaults: { "feature.dark_mode": false },
 *   context: autoContext({ userId: "user_123", plan: "pro" }),
 * });
 *
 * flags.get("feature.dark_mode"); // → false (instant)
 * flags.on("updated", () => {
 *   flags.get("feature.dark_mode"); // → true (from API)
 * });
 * ```
 */
export function initConfig(options: InitConfigOptions): Flags {
  const defaults = options.defaults ?? {};

  // Create the underlying config client (optimistic strategy = instant return + background fetch)
  const client: ConfigClient = createConfig({
    clientId: options.clientId,
    loadingStrategy: "optimistic",
    context: options.context,
    baseUrl: options.baseUrl,
  });

  return {
    get<T = unknown>(key: string): T {
      const resolved = client.getValue<T>(key);
      if (resolved !== undefined) return resolved;
      return defaults[key] as T;
    },

    flag(key: string): boolean {
      const resolved = client.getFlag(key);
      if (resolved) return true;
      // If not resolved yet, check defaults
      const val = client.getValue(key);
      if (val !== undefined) return val === true;
      return defaults[key] === true;
    },

    all(): Record<string, unknown> {
      const resolved = client.getAll();
      // Merge: resolved values override defaults
      return { ...defaults, ...resolved };
    },

    setContext(context: EvaluationContext): void {
      client.setContext(context);
    },

    refresh(): Promise<void> {
      return client.refresh();
    },

    on<E extends ConfigEventType>(event: E, cb: ConfigEventCallback<E>): void {
      client.on(event, cb);
    },

    off<E extends ConfigEventType>(event: E, cb: ConfigEventCallback<E>): void {
      client.off(event, cb);
    },
  };
}
