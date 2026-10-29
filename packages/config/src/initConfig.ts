// ═══════════════════════════════════════════════════════════════
// initConfig — Primary SDK entry point
//
// Three-tier priority fetching model:
//
//   Tier 1 — PREFETCH (init)
//     Declared via `prefetch: [...]` at initConfig time.
//     Fetched immediately. ready() blocks until this completes.
//
//   Tier 2 — PAGE (runtime)
//     Declared via flags.prefetch(keys) per route/component.
//     Fire-and-forget. Keys deduplicated against Tier 1.
//
//   Tier 3 — IDLE
//     Full fetchAll() during browser idle time via requestIdleCallback.
//     Fills in all remaining keys in the background.
//
// get() behaviour:
//   - Memory/cache hit → resolves instantly
//   - Default provided  → resolves instantly
//   - No default        → suspends until idle fetch or refresh delivers
//                         the key, or global timeout fires
//   - Timeout           → onError called, Promise rejects with SdkError
//
// Context update:
//   setContext() is fire-and-forget (debounced 100ms).
//   Re-fetches only already-fetched keys in tier order.
// ═══════════════════════════════════════════════════════════════

import { browserStorage } from "./cache/browserStorage.js";
import { API_ENDPOINTS } from "./constants.js";
import { SdkError, ConfigError } from "./errors/index.js";
import { TypedEventEmitter } from "./events/EventEmitter.js";
import { createProjectedFetcher } from "./fetch/projectedFetcher.js";
import { TierFetcher } from "./fetch/TierFetcher.js";
import type { EvaluationContext } from "./plugins/types.js";
import { withRetry } from "./retry/RetryEngine.js";
import { warnForFetchFailure, warnIfCspBlocksUrl } from "./transport/browserDiagnostics.js";
import { createHttpTransport } from "./transport/HttpTransport.js";
import type { CacheStorage, ConfigEventCallback, ConfigEventType } from "./types.js";
import { DEFAULT_CACHE_TTL, DEFAULT_RETRY } from "./types.js";

const DEFAULT_BASE_URL = "https://jewel998-config.web.app/api";
const DEFAULT_TIMEOUT_MS = 30_000;
const CONTEXT_DEBOUNCE_MS = 100;
const MIN_REFETCH_INTERVAL_MS = 30_000;

/** Reserved storage keys for persisted gating metadata. */
const VERSION_STORAGE_KEY = "__version__";
const CONTEXT_FINGERPRINT_STORAGE_KEY = "__ctx__";

/**
 * Stable string fingerprint of an evaluation context. Keys are sorted so the
 * same context always produces the same fingerprint regardless of insertion
 * order. Used to detect when context changed across loads (which invalidates
 * persisted values even if the config version is unchanged).
 */
function contextFingerprint(ctx: EvaluationContext): string {
  const stable = (value: unknown): unknown => {
    if (value === null || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map(stable);
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) sorted[k] = stable(obj[k]);
    return sorted;
  };
  try {
    return JSON.stringify(stable(ctx ?? {}));
  } catch {
    return "";
  }
}

// ─── Public types ──────────────────────────────────────────────

export interface InitConfigOptions {
  /** Required. API key from the portal (cid_ for client, svr_ for server). */
  clientId: string;

  /**
   * Tier 1 keys — fetched immediately, block ready() resolution.
   * Use for values your app cannot render without.
   * e.g. ["app.maintenance_mode", "feature.auth_provider"]
   */
  prefetch?: string[];

  /**
   * Default/fallback values returned instantly before any tier resolves.
   * get() resolves immediately when a key has a default here.
   */
  defaults?: Record<string, unknown>;

  /** User context for targeting evaluation. Use autoContext() to auto-detect. */
  context?: EvaluationContext;

  /**
   * Your self-hosted API URL.
   * Default: https://jewel998-config.web.app/api (demo instance)
   */
  baseUrl?: string;

  /**
   * Cache storage adapter. Default: `browserStorage()` (localStorage), which
   * persists values and the config version across page loads so a reload or
   * return visit skips the `/config` fetch when nothing changed. Falls back to
   * in-memory automatically when `localStorage` is unavailable (SSR / Node /
   * server keys). Pass `memoryStorage()` explicitly to opt out of persistence.
   */
  storage?: CacheStorage;

  /**
   * Version polling interval in milliseconds.
   * Default: 300_000 (5 minutes). Set to 0 to disable.
   */
  pollInterval?: number;

  /**
   * Global timeout in milliseconds for get() calls with no default.
   * If a key does not arrive within this window, get() rejects with
   * SdkError { type: "TIMEOUT" } and onError is called.
   * Default: 30_000 (30 seconds).
   */
  timeout?: number;

  /**
   * Global error handler. Called on every SDK-level error:
   * timeouts, fetch failures, auth errors, key-not-found, rate limits.
   *
   * get() also rejects with the same error — onError is for centralised
   * logging/monitoring, not a replacement for catch().
   */
  onError?: (error: SdkError) => void;
}

export interface Flags {
  /**
   * Resolves when Tier 1 (init prefetch) keys have been fetched.
   * Resolves instantly if no prefetch keys were declared.
   */
  ready(): Promise<void>;

  /**
   * Tier 2 fetch hint — fire-and-forget.
   * Keys already tracked in Tier 1 or already fetched are skipped.
   * Emits "updated" and "updated:key" events per key on completion.
   */
  prefetch(keys: string[]): void;

  /**
   * Get a typed config value asynchronously.
   *
   * Resolution order:
   *   1. Memory / cache hit         → resolves instantly
   *   2. Default in defaults map    → resolves instantly
   *   3. Inline defaultValue arg    → resolves instantly
   *   4. No default                 → suspends until idle fetch or refresh
   *                                   delivers the key
   *
   * On timeout (global, default 30s):
   *   - onError is called with SdkError { type: "TIMEOUT", key }
   *   - Promise rejects with the same SdkError
   */
  get<T = unknown>(key: string): Promise<T>;
  get<T = unknown>(key: string, defaultValue: T): Promise<T>;

  /**
   * Returns a snapshot of all currently fetched values merged with defaults.
   * Does not wait for any in-flight fetches — returns current state only.
   */
  all(): Promise<Record<string, unknown>>;

  /**
   * Update user context. Fire-and-forget, debounced 100ms.
   * Re-fetches all already-fetched keys in tier order with the new context.
   * Subscribe to "updated" events to react when the re-fetch completes.
   */
  setContext(context: EvaluationContext): void;

  /**
   * Re-fetch all already-fetched keys in tier order.
   * Resolves when all re-fetches complete.
   */
  refresh(): Promise<void>;

  /**
   * Subscribe to events.
   *
   * Key-specific:   flags.on("updated:feature.dark_mode", (value) => ...)
   * Batch updated:  flags.on("updated", ({ keys, source }) => ...)
   * Fetch errors:   flags.on("fetchError", ({ error }) => ...)
   */
  on(event: string, cb: (payload: unknown) => void): void;

  /** Unsubscribe from events. */
  off(event: string, cb: (payload: unknown) => void): void;
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
  warnIfCspBlocksUrl(baseUrl);
  const storage = options.storage ?? browserStorage();
  const retry = { ...DEFAULT_RETRY };
  const timeoutMs = options.timeout ?? DEFAULT_TIMEOUT_MS;
  const onError = options.onError;
  const initPrefetch = options.prefetch ?? [];
  const events = new TypedEventEmitter();

  let currentContext: EvaluationContext = options.context ?? {};

  // ── Transport + fetcher ──────────────────────────────────────
  const transport = createHttpTransport({
    baseUrl,
    clientId: options.clientId,
    evaluationMode: "server",
    getContext: () => currentContext,
  });

  const baseFetcher = createProjectedFetcher(transport);
  const tierFetcher = new TierFetcher(baseFetcher);

  // ── In-memory data store ─────────────────────────────────────
  const data: Record<string, unknown> = {};

  // Version known to the SDK. Hydrated from persistent storage on init so a
  // reload can skip the config fetch when the version is unchanged.
  const storedVersion = storage.get<string | number>(VERSION_STORAGE_KEY);
  let cachedVersion: string | null = storedVersion == null ? null : String(storedVersion);
  const currentFingerprint = contextFingerprint(currentContext);

  // If the persisted context fingerprint differs from this init's context, any
  // persisted per-user values are stale — drop the persisted version so the
  // boot gate re-fetches rather than serving values evaluated for old context.
  if (storage.get<string>(CONTEXT_FINGERPRINT_STORAGE_KEY) !== currentFingerprint) {
    cachedVersion = null;
  }

  /** Persist the current version + context fingerprint next to the values. */
  function persistVersion(version: string): void {
    cachedVersion = version;
    storage.set(VERSION_STORAGE_KEY, version, DEFAULT_CACHE_TTL);
    storage.set(CONTEXT_FINGERPRINT_STORAGE_KEY, currentFingerprint, DEFAULT_CACHE_TTL);
  }

  function applyResult(result: Record<string, unknown>): string[] {
    const keys = Object.keys(result);
    for (const key of keys) {
      data[key] = result[key];
      storage.set(key, result[key], DEFAULT_CACHE_TTL);
    }
    // Update the __all__ snapshot incrementally
    const existing = storage.get<Record<string, unknown>>("__all__") ?? {};
    storage.set("__all__", { ...existing, ...result }, DEFAULT_CACHE_TTL);
    return keys;
  }

  type UpdateSource = "prefetch" | "page" | "idle" | "refresh" | "background" | "version-check";

  function emitUpdated(keys: string[], source: UpdateSource): void {
    if (keys.length === 0) return;
    events.emit("updated", { keys, source });
  }

  // ── Remote version check (shared by boot gate + polling) ─────
  async function fetchRemoteVersion(): Promise<string | null> {
    try {
      const res = await fetch(`${baseUrl}/${API_ENDPOINTS.version}?clientId=${options.clientId}`, {
        // Let the shared CDN cache the response, but do not let the browser
        // create a conditional request that can become a CORS-less 304.
        cache: "no-store",
      });
      // 304 => unchanged; reuse the locally persisted version.
      if (res.status === 304) return cachedVersion;
      if (!res.ok) return null;
      const body = (await res.json()) as {
        data?: { version?: string | number };
        version?: string | number;
      };
      // HTTP handlers wrap their payload in `data`; accept the legacy
      // top-level shape as well so older deployments remain compatible.
      const version = body.data?.version ?? body.version;
      return version == null ? null : String(version);
    } catch (error) {
      warnForFetchFailure(`${baseUrl}/${API_ENDPOINTS.version}`, error);
      return null;
    }
  }

  /** True when every key is already present in persistent storage. */
  function allKeysCached(keys: string[]): boolean {
    return keys.every((k) => storage.get(k) !== undefined);
  }

  function hydrateFromStorage(keys: string[]): string[] {
    const hydrated: string[] = [];
    for (const key of keys) {
      const cached = storage.get(key);
      if (cached !== undefined) {
        data[key] = cached;
        hydrated.push(key);
      }
    }
    return hydrated;
  }

  // ── Tier 1: init prefetch (version-gated against persisted cache) ─
  const readyPromise: Promise<void> =
    initPrefetch.length > 0
      ? (async () => {
          try {
            // Boot gate: if we have a persisted version and values, confirm the
            // remote version matches before spending a /config call. On match,
            // serve from storage and skip the fetch entirely.
            if (cachedVersion !== null && allKeysCached(initPrefetch)) {
              const remote = await fetchRemoteVersion();
              if (remote !== null && remote === cachedVersion) {
                const hydrated = hydrateFromStorage(initPrefetch);
                tierFetcher.markFetched(initPrefetch, "prefetch");
                emitUpdated(hydrated, "prefetch");
                return;
              }
              // Version advanced (or unknown) — fall through to a real fetch.
              if (remote !== null) cachedVersion = remote;
            }

            const result = await withRetry(
              () => tierFetcher.fetchTier(initPrefetch, "prefetch"),
              retry,
            );
            const fetched = applyResult(result.data);
            // Persist the version delivered alongside these values — no extra
            // /version round trip needed; the /config response carries it.
            if (result.version !== null) persistVersion(result.version);
            tierFetcher.notifyWaiters(result.data);
            emitUpdated(fetched, "prefetch");
          } catch (err) {
            const sdkErr = new SdkError(
              "FETCH_FAILED",
              `Prefetch failed: ${(err as Error).message}`,
              undefined,
              err as Error,
            );
            onError?.(sdkErr);
            events.emit("fetchError", {
              error: sdkErr,
              retryCount: retry.maxRetries,
              willRetry: false,
            });
            // Don't re-throw — app still runs on defaults
          }
        })()
      : Promise.resolve();

  // ── Tier 3: idle fetch (skipped when the full snapshot is fresh) ──
  readyPromise.then(() => {
    scheduleIdleFetch(async () => {
      try {
        // If we already hold the full snapshot for the current version,
        // there is nothing to fill in — skip the idle /config call.
        if (cachedVersion !== null && storage.get("__all__") !== undefined) {
          const remote = await fetchRemoteVersion();
          if (remote !== null && remote === cachedVersion) return;
          if (remote !== null) cachedVersion = remote;
        }
        const result = await tierFetcher.fetchAll();
        const fetched = applyResult(result.data);
        if (result.version !== null) persistVersion(result.version);
        tierFetcher.notifyWaiters(result.data);
        emitUpdated(fetched, "idle");
      } catch {
        // Idle fetch is best-effort — silently ignore
        // Pending waiters will eventually time out via get()
      }
    });
  });

  // ── Version polling ──────────────────────────────────────────
  async function checkVersion(): Promise<void> {
    const version = await fetchRemoteVersion();
    if (version === null) return;
    if (cachedVersion === null) {
      persistVersion(version);
      return;
    }
    if (version !== cachedVersion) {
      persistVersion(version);
      await doRefresh();
    }
  }

  if (pollInterval > 0 && typeof window !== "undefined") {
    // The Tier 1 boot gate already checks the remote version when prefetch
    // keys are configured. Running another check immediately after `ready()`
    // only duplicates the /version request on every page load.
    if (initPrefetch.length === 0) readyPromise.then(() => void checkVersion());
    setInterval(checkVersion, pollInterval);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void checkVersion();
    });
  }

  // ── Refresh (re-fetch fetched keys in tier order) ─────────────
  let lastRefetchTime = 0;

  async function doRefresh(): Promise<void> {
    if (Date.now() - lastRefetchTime < MIN_REFETCH_INTERVAL_MS) return;
    lastRefetchTime = Date.now();

    const { prefetch: pf, page, idle } = tierFetcher.getFetchedKeys();
    const allFetched: string[] = [];

    const refetches: Promise<void>[] = [];

    if (pf.length > 0) {
      refetches.push(
        withRetry(() => tierFetcher.refetchKeys(pf), retry)
          .then((r) => {
            applyResult(r.data);
            if (r.version !== null) persistVersion(r.version);
            tierFetcher.notifyWaiters(r.data);
            allFetched.push(...Object.keys(r.data));
          })
          .catch(() => {}),
      );
    }

    if (page.length > 0) {
      refetches.push(
        withRetry(() => tierFetcher.refetchKeys(page), retry)
          .then((r) => {
            applyResult(r.data);
            if (r.version !== null) persistVersion(r.version);
            tierFetcher.notifyWaiters(r.data);
            allFetched.push(...Object.keys(r.data));
          })
          .catch(() => {}),
      );
    }

    if (idle.length > 0) {
      refetches.push(
        tierFetcher
          .fetchAll()
          .then((r) => {
            applyResult(r.data);
            if (r.version !== null) persistVersion(r.version);
            tierFetcher.notifyWaiters(r.data);
            allFetched.push(...Object.keys(r.data));
          })
          .catch(() => {}),
      );
    }

    await Promise.allSettled(refetches);
    emitUpdated(allFetched, "refresh");
  }

  // ── Context re-fetch ─────────────────────────────────────────
  let contextDebounce: ReturnType<typeof setTimeout> | null = null;

  // ── Public API ───────────────────────────────────────────────
  const flags: Flags = {
    ready(): Promise<void> {
      return readyPromise;
    },

    prefetch(keys: string[]): void {
      void (async () => {
        try {
          const result = await withRetry(() => tierFetcher.fetchTier(keys, "page"), retry);
          const fetched = applyResult(result.data);
          if (result.version !== null) persistVersion(result.version);
          tierFetcher.notifyWaiters(result.data);
          emitUpdated(fetched, "page");
        } catch (err) {
          const sdkErr = new SdkError(
            "FETCH_FAILED",
            `Page prefetch failed: ${(err as Error).message}`,
            undefined,
            err as Error,
          );
          onError?.(sdkErr);
          events.emit("fetchError", {
            error: sdkErr,
            retryCount: retry.maxRetries,
            willRetry: false,
          });
        }
      })();
    },

    get<T = unknown>(key: string, defaultValue?: T): Promise<T> {
      // 1. Memory hit
      if (key in data) return Promise.resolve(data[key] as T);

      // 2. Cache hit
      const cached = storage.get<T>(key);
      if (cached !== undefined) {
        data[key] = cached;
        return Promise.resolve(cached);
      }

      // 3. Default from map
      if (key in defaults) return Promise.resolve(defaults[key] as T);

      // 4. Inline default
      if (defaultValue !== undefined) return Promise.resolve(defaultValue);

      // 5. Suspend — wait for idle fetch or refresh to deliver this key
      return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
          const err = new SdkError(
            "TIMEOUT",
            `get("${key}") timed out after ${timeoutMs}ms — key was not delivered by idle fetch or refresh`,
            key,
          );
          onError?.(err);
          reject(err);
        }, timeoutMs);

        tierFetcher.waitForKey(key).then(
          (value) => {
            clearTimeout(timer);
            resolve(value as T);
          },
          (err: Error) => {
            clearTimeout(timer);
            const sdkErr = new SdkError("FETCH_FAILED", err.message, key, err);
            onError?.(sdkErr);
            reject(sdkErr);
          },
        );
      });
    },

    async all(): Promise<Record<string, unknown>> {
      const snapshot = storage.get<Record<string, unknown>>("__all__") ?? {};
      return { ...defaults, ...snapshot, ...data };
    },

    setContext(context: EvaluationContext): void {
      currentContext = { ...context };
      if (contextDebounce) clearTimeout(contextDebounce);
      contextDebounce = setTimeout(() => {
        contextDebounce = null;
        void doRefresh();
      }, CONTEXT_DEBOUNCE_MS);
    },

    async refresh(): Promise<void> {
      await doRefresh();
    },

    on(event: string, cb: (...args: unknown[]) => void): void {
      // Key-specific: "updated:feature.dark_mode"
      if (event.startsWith("updated:")) {
        const key = event.slice("updated:".length);
        events.onKey(key, cb as (value: unknown) => void);
        return;
      }
      events.on(event as ConfigEventType, cb as ConfigEventCallback<ConfigEventType>);
    },

    off(event: string, cb: (...args: unknown[]) => void): void {
      if (event.startsWith("updated:")) {
        const key = event.slice("updated:".length);
        events.offKey(key, cb as (value: unknown) => void);
        return;
      }
      events.off(event as ConfigEventType, cb as ConfigEventCallback<ConfigEventType>);
    },
  };

  return flags;
}

// ─── Idle scheduling ──────────────────────────────────────────

function scheduleIdleFetch(fn: () => void): void {
  if (typeof window === "undefined") return;
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(fn, { timeout: 2000 });
  } else {
    setTimeout(fn, 200);
  }
}
