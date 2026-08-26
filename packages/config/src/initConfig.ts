// ═══════════════════════════════════════════════════════════════
// initConfig — Primary SDK entry point
//
// Three-tier priority fetching:
//
//   Tier 1 — CRITICAL  Fetched immediately, blocks ready() resolution.
//                      Use for values the app cannot render without.
//
//   Tier 2 — PAGE      Fetched on demand via flags.prefetch(keys).
//                      Call this in your route/page component.
//                      Non-blocking — emits "updated" when done.
//
//   Tier 3 — PREFETCH  Everything else, fetched in the background
//                      during browser idle time via requestIdleCallback.
//
// Context update re-fetch:
//   setContext() re-fetches only already-fetched keys (tiers 1+2+3),
//   in tier order, rather than triggering a full 1000-key fetch.
// ═══════════════════════════════════════════════════════════════

import { memoryStorage } from "./cache/memoryStorage.js";
import { ConfigError } from "./errors/index.js";
import { TypedEventEmitter } from "./events/EventEmitter.js";
import { createProjectedFetcher } from "./fetch/projectedFetcher.js";
import { TierFetcher } from "./fetch/TierFetcher.js";
import type { EvaluationContext } from "./plugins/types.js";
import { withRetry } from "./retry/RetryEngine.js";
import { createHttpTransport } from "./transport/HttpTransport.js";
import type { CacheStorage, ConfigEventCallback, ConfigEventType } from "./types.js";
import { DEFAULT_CACHE_TTL, DEFAULT_RETRY } from "./types.js";

const DEFAULT_BASE_URL = "https://jewel998-config.web.app/api";
const CONTEXT_DEBOUNCE_MS = 100;
const MIN_REFETCH_INTERVAL_MS = 30_000;

// ─── Public options ────────────────────────────────────────────

export interface InitConfigOptions {
  /** Required. API key from the portal (cid_ for client, svr_ for server). */
  clientId: string;

  /**
   * Tier 1 keys — fetched immediately and block ready() resolution.
   * Use for values your app cannot render without:
   *   e.g. ["app.maintenance_mode", "feature.auth_provider"]
   *
   * If omitted, ready() resolves immediately (no blocking fetch).
   */
  critical?: string[];

  /**
   * Default/fallback values returned instantly before any tier resolves.
   * Keys are flag names; values are what your app uses before the API responds.
   */
  defaults?: Record<string, unknown>;

  /** User context for targeting evaluation. Use autoContext() to auto-detect browser info. */
  context?: EvaluationContext;

  /**
   * Your self-hosted API URL. Points to your Firebase deployment.
   * Default: https://jewel998-config.web.app/api (demo instance)
   */
  baseUrl?: string;

  /** Cache storage adapter. Default: memoryStorage() */
  storage?: CacheStorage;

  /**
   * Polling interval in milliseconds for version checks.
   * Default: 300000 (5 minutes). Set to 0 to disable.
   */
  pollInterval?: number;
}

// ─── Public Flags interface ────────────────────────────────────

export interface Flags {
  /**
   * Promise that resolves when Tier 1 (critical) keys are ready.
   * If no critical keys are declared, resolves immediately.
   *
   * @example
   * const flags = initConfig({ critical: ["app.maintenance_mode"] });
   * await flags.ready();
   * // safe to read app.maintenance_mode now
   */
  ready(): Promise<void>;

  /**
   * Fetch Tier 2 (page-level) keys.
   * Non-blocking — returns immediately, emits "updated" when the keys arrive.
   * Call this in your route/page component on mount.
   *
   * Keys declared here are remembered — on setContext they are re-fetched
   * before Tier 3 keys.
   *
   * @example
   * flags.prefetch(["feature.new_checkout", "app.upload_limit"]);
   */
  prefetch(keys: string[]): void;

  /** Get a typed flag value. Returns default until the tier containing this key resolves. */
  get<T = unknown>(key: string): T;

  /** Get a boolean flag. Returns false if the flag doesn't exist or hasn't resolved yet. */
  flag(key: string): boolean;

  /** Get all resolved flag values merged with defaults. */
  all(): Record<string, unknown>;

  /**
   * Update user context. Triggers a scoped re-fetch:
   * only keys already fetched (across all tiers) are re-fetched,
   * in tier order (critical → page → prefetch).
   */
  setContext(context: EvaluationContext): void;

  /** Force re-fetch of all already-fetched keys. */
  refresh(): Promise<void>;

  /** Subscribe to events: "ready", "updated", "fetchError" */
  on<E extends ConfigEventType>(event: E, cb: ConfigEventCallback<E>): void;

  /** Unsubscribe from events. */
  off<E extends ConfigEventType>(event: E, cb: ConfigEventCallback<E>): void;
}

// ─── Implementation ────────────────────────────────────────────

export function initConfig(options: InitConfigOptions): Flags {
  if (!options.clientId) {
    throw new ConfigError("clientId is required", "MISSING_CLIENT_ID");
  }
  if (typeof window === "undefined" && !options.clientId.startsWith("svr_")) {
    throw new ConfigError(
      "Client keys (cid_) require a browser environment.",
      "INITIALIZATION_FAILED",
    );
  }

  const defaults = options.defaults ?? {};
  const pollInterval = options.pollInterval ?? 300_000;
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const storage = options.storage ?? memoryStorage();
  const retry = { ...DEFAULT_RETRY };
  const criticalKeys = options.critical ?? [];
  const events = new TypedEventEmitter();

  // ── Transport + fetcher ──────────────────────────────────────
  let currentContext: EvaluationContext = options.context ?? {};

  const transport = createHttpTransport({
    baseUrl,
    clientId: options.clientId,
    evaluationMode: "server",
    getContext: () => currentContext,
  });

  // Always use projected fetcher — sends only the requested keys to the API
  const baseFetcher = createProjectedFetcher(transport);
  const tierFetcher = new TierFetcher(baseFetcher);

  // ── In-memory data store ─────────────────────────────────────
  const data: Record<string, unknown> = {};

  function applyResult(result: Record<string, unknown>): string[] {
    const keys = Object.keys(result);
    for (const key of keys) {
      data[key] = result[key];
      storage.set(key, result[key], DEFAULT_CACHE_TTL);
    }
    storage.set("__all__", { ...data }, DEFAULT_CACHE_TTL);
    return keys;
  }

  // ── Tier 1: Critical fetch ───────────────────────────────────
  // Blocks ready(). If no critical keys, resolves instantly.
  const readyPromise: Promise<void> =
    criticalKeys.length > 0
      ? (async () => {
          try {
            const result = await withRetry(
              () => tierFetcher.fetchTier(criticalKeys, "critical"),
              retry,
            );
            applyResult(result);
            events.emit("updated", { keys: Object.keys(result), source: "background" });
          } catch (error) {
            events.emit("fetchError", {
              error: error as Error,
              retryCount: retry.maxRetries,
              willRetry: false,
            });
            // Don't re-throw — app can still run on defaults
          }
        })()
      : Promise.resolve();

  // ── Tier 3: Idle prefetch ────────────────────────────────────
  // Fires after Tier 1 completes, during browser idle time.
  readyPromise.then(() => {
    scheduleIdleFetch(async () => {
      try {
        const result = await tierFetcher.fetchAll();
        const newKeys = applyResult(result);
        if (newKeys.length > 0) {
          events.emit("updated", { keys: newKeys, source: "background" });
        }
      } catch {
        // Silently ignore — prefetch is best-effort
      }
    });
  });

  // ── Version polling ──────────────────────────────────────────
  let cachedVersion: string | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  async function checkVersion(): Promise<void> {
    try {
      const res = await fetch(`${baseUrl}/v1/version?clientId=${options.clientId}`, {
        headers: cachedVersion ? { "If-None-Match": `"${cachedVersion}"` } : {},
      });
      if (res.status === 304) return;
      if (!res.ok) return;

      const { version } = (await res.json()) as { version: string; changedKeys: string[] };

      if (cachedVersion === null) {
        cachedVersion = version;
        return;
      }

      if (version !== cachedVersion) {
        cachedVersion = version;
        await refreshFetchedKeys();
      }
    } catch {
      // Silently ignore polling errors
    }
  }

  if (pollInterval > 0 && typeof window !== "undefined") {
    readyPromise.then(() => void checkVersion());
    pollTimer = setInterval(checkVersion, pollInterval);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void checkVersion();
    });
  }

  // ── Context re-fetch ─────────────────────────────────────────
  // Re-fetch only already-fetched keys, in tier order.
  let lastRefetchTime = 0;
  let contextDebounce: ReturnType<typeof setTimeout> | null = null;

  async function refreshFetchedKeys(): Promise<void> {
    if (Date.now() - lastRefetchTime < MIN_REFETCH_INTERVAL_MS) return;
    lastRefetchTime = Date.now();

    const { critical, page, prefetch } = tierFetcher.getFetchedKeys();

    // Re-fetch in tier order: critical first, then page, then prefetch
    // All three fire in parallel internally but are logically ordered
    const refetches: Promise<void>[] = [];

    if (critical.length > 0) {
      refetches.push(
        withRetry(() => tierFetcher.fetchTier(critical, "critical"), retry)
          .then((r) => {
            applyResult(r);
          })
          .catch(() => {}),
      );
    }

    if (page.length > 0) {
      refetches.push(
        withRetry(() => tierFetcher.fetchTier(page, "page"), retry)
          .then((r) => {
            applyResult(r);
          })
          .catch(() => {}),
      );
    }

    if (prefetch.length > 0) {
      refetches.push(
        tierFetcher
          .fetchAll()
          .then((r) => {
            applyResult(r);
          })
          .catch(() => {}),
      );
    }

    await Promise.allSettled(refetches);

    const allFetched = [...critical, ...page, ...prefetch];
    if (allFetched.length > 0) {
      events.emit("updated", { keys: allFetched, source: "refresh" });
    }
  }

  // ── Public API ───────────────────────────────────────────────
  return {
    ready(): Promise<void> {
      return readyPromise;
    },

    prefetch(keys: string[]): void {
      // Tier 2: fire-and-forget, track keys for future context re-fetches
      void (async () => {
        try {
          const result = await withRetry(() => tierFetcher.fetchTier(keys, "page"), retry);
          const newKeys = applyResult(result);
          if (newKeys.length > 0) {
            events.emit("updated", { keys: newKeys, source: "background" });
          }
        } catch (error) {
          events.emit("fetchError", {
            error: error as Error,
            retryCount: retry.maxRetries,
            willRetry: false,
          });
        }
      })();
    },

    get<T = unknown>(key: string): T {
      if (key in data) return data[key] as T;
      const cached = storage.get<T>(key);
      if (cached !== undefined) {
        data[key] = cached;
        return cached;
      }
      return defaults[key] as T;
    },

    flag(key: string): boolean {
      const val = key in data ? data[key] : (storage.get(key) ?? defaults[key]);
      return val === true;
    },

    all(): Record<string, unknown> {
      const cached = storage.get<Record<string, unknown>>("__all__") ?? {};
      return { ...defaults, ...cached, ...data };
    },

    setContext(context: EvaluationContext): void {
      currentContext = { ...context };

      if (contextDebounce) clearTimeout(contextDebounce);
      contextDebounce = setTimeout(() => {
        contextDebounce = null;
        void refreshFetchedKeys();
      }, CONTEXT_DEBOUNCE_MS);
    },

    async refresh(): Promise<void> {
      await refreshFetchedKeys();
    },

    on<E extends ConfigEventType>(event: E, cb: ConfigEventCallback<E>): void {
      events.on(event, cb);
    },

    off<E extends ConfigEventType>(event: E, cb: ConfigEventCallback<E>): void {
      events.off(event, cb);
    },
  };
}

// ─── Idle scheduling ──────────────────────────────────────────

/**
 * Schedule a callback during browser idle time.
 * Falls back to setTimeout(fn, 200) when requestIdleCallback is unavailable.
 */
function scheduleIdleFetch(fn: () => void): void {
  if (typeof window === "undefined") return;

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(fn, { timeout: 2000 });
  } else {
    setTimeout(fn, 200);
  }
}
