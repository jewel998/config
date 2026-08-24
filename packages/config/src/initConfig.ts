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

import { createConfig } from "./createConfig.js";
import type { EvaluationContext } from "./plugins/types.js";
import type {
  CacheStorage,
  ConfigClient,
  ConfigEventCallback,
  ConfigEventType,
  CreateConfigOptions,
} from "./types.js";

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

  /**
   * Your self-hosted API URL. Points to your Firebase deployment.
   * Default: https://jewel998-config.web.app/api (demo instance)
   *
   * @example "https://your-project.web.app/api"
   */
  baseUrl?: string;

  /**
   * Cache storage adapter. Controls where resolved config values are persisted.
   *
   * - `memoryStorage()` (default) — In-memory, lost on page reload
   * - `browserStorage()` — localStorage, persists across page reloads and sessions
   *
   * @example
   * ```ts
   * import { browserStorage } from "@jewel998/config";
   * initConfig({ storage: browserStorage({ prefix: "myapp" }) })
   * ```
   */
  storage?: CacheStorage;

  /**
   * Polling interval in milliseconds for version checks.
   * The SDK periodically calls /api/version (lightweight ~100 bytes)
   * and only re-fetches full data when the version changes.
   *
   * Default: 300000 (5 minutes). Set to 0 to disable polling.
   */
  pollInterval?: number;
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
  const pollInterval = options.pollInterval ?? 300_000; // 5 minutes default
  const baseUrl = options.baseUrl ?? "https://jewel998-config.web.app/api";

  // Create the underlying config client (optimistic strategy = instant return + background fetch)
  const client: ConfigClient = createConfig({
    clientId: options.clientId,
    loadingStrategy: "optimistic",
    context: options.context,
    storage: options.storage,
    baseUrl,
  });

  // Version-based polling: check /api/version periodically, delta-fetch on change
  let cachedVersion: string | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  async function checkVersion(): Promise<void> {
    try {
      const res = await fetch(`${baseUrl}/v1/version?clientId=${options.clientId}`, {
        headers: cachedVersion ? { "If-None-Match": `"${cachedVersion}"` } : {},
      });

      // 304 = version unchanged, no action needed
      if (res.status === 304) return;
      if (!res.ok) return;

      const { version, changedKeys } = (await res.json()) as {
        version: string;
        changedKeys: string[];
      };

      // First check — just store version, no refetch (initial fetch already happened)
      if (cachedVersion === null) {
        cachedVersion = version;
        return;
      }

      // Version changed — need to refresh
      if (version !== cachedVersion) {
        cachedVersion = version;
        // If we know which keys changed, we could delta-fetch in the future
        // For now, full refresh (still efficient with CDN + deduplication)
        await client.refresh();
      }
    } catch {
      // Silently ignore polling errors — cache continues to work
    }
  }

  // Start polling if interval > 0
  if (pollInterval > 0 && typeof window !== "undefined") {
    // Initial version check after first fetch completes
    client.on("ready", () => {
      void checkVersion();
    });

    pollTimer = setInterval(checkVersion, pollInterval);

    // Also check on tab visibility change (user returns to tab)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        void checkVersion();
      }
    });
  }

  return {
    get<T = unknown>(key: string): T {
      const resolved = client.getValue<T>(key);
      if (resolved !== undefined) return resolved;
      return defaults[key] as T;
    },

    flag(key: string): boolean {
      const resolved = client.getFlag(key);
      if (resolved) return true;
      const val = client.getValue(key);
      if (val !== undefined) return val === true;
      return defaults[key] === true;
    },

    all(): Record<string, unknown> {
      const resolved = client.getAll();
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
