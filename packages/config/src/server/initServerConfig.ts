// ═══════════════════════════════════════════════════════════════
// initServerConfig — Server-side SDK entry point
//
// Designed for Node.js, Deno, Bun, and server-side runtimes.
// Does NOT use window, document, navigator, localStorage,
// or any browser-specific APIs.
//
// Key differences from initConfig (browser):
//   - Always uses pessimistic strategy (await flags before serving)
//   - No polling (server processes are long-lived; use refresh())
//   - No visibility change detection
//   - Plugins always run locally (svr_ keys provide full flag data)
//   - Optional background refresh via configurable interval
// ═══════════════════════════════════════════════════════════════

import { memoryStorage } from "../cache/memoryStorage.js";
import { buildConfigClient } from "../client/ConfigClient.js";
import { ConfigError } from "../errors/index.js";
import { TypedEventEmitter } from "../events/EventEmitter.js";
import { createBatchFetcher } from "../fetch/batchFetcher.js";
import { createProjectedFetcher } from "../fetch/projectedFetcher.js";
import { executePessimistic } from "../loading/pessimistic.js";
import type { EvaluationContext, EvaluationPlugin } from "../plugins/types.js";
import { createHttpTransport } from "../transport/HttpTransport.js";
import type {
  CacheStorage,
  ConfigClient,
  ConfigEventCallback,
  ConfigEventType,
  FetchGranularity,
  RetryConfig,
} from "../types.js";
import { DEFAULT_RETRY, DEFAULT_TIMEOUT } from "../types.js";

export interface InitServerConfigOptions {
  /**
   * Required. Server API key from the portal (must start with `svr_`).
   *
   * Server keys return full flag data (targeting rules, rollouts, segments)
   * for local evaluation. The Cloud Function does NOT validate the
   * request origin for server keys — no domain allowlist is enforced.
   */
  clientId: string;

  /**
   * Your self-hosted API URL. Points to your Firebase deployment.
   * Default: https://jewel998-config.web.app/api (demo instance)
   *
   * @example "https://your-project.web.app/api"
   */
  baseUrl?: string;

  /**
   * Evaluation context for targeting rules and rollouts.
   * Use `serverContext()` helper to build this from request/session data.
   *
   * Can be updated post-init via `setContext()` for per-request evaluation.
   */
  context?: EvaluationContext;

  /**
   * Evaluation plugins to register (tree-shakeable pipeline steps).
   *
   * @example
   * ```ts
   * import { targetingPlugin } from "@jewel998/config/targeting";
   * import { rolloutPlugin } from "@jewel998/config/rollout";
   *
   * const config = await initServerConfig({
   *   clientId: "svr_xxx",
   *   plugins: [targetingPlugin(), rolloutPlugin()],
   * });
   * ```
   */
  plugins?: EvaluationPlugin[];

  /**
   * Fetch granularity.
   * - "batch" (default): Fetch all flags in one request (recommended for servers)
   * - "projected": Fetch only specific keys on demand
   */
  fetchGranularity?: FetchGranularity;

  /** Cache storage adapter. Default: memoryStorage() (in-process Map) */
  storage?: CacheStorage;

  /** Retry configuration for failed fetches */
  retry?: RetryConfig;

  /** Timeout for initial fetch (ms). Default: 10000 */
  timeout?: number;

  /**
   * Background refresh interval in milliseconds.
   * The SDK will periodically re-fetch flags to keep them current.
   *
   * Default: 0 (disabled). Set to e.g. 60_000 for 1-minute refresh.
   *
   * For most server apps, calling `refresh()` after receiving a webhook
   * notification is more efficient than background polling.
   */
  refreshInterval?: number;
}

export interface ServerFlags extends ConfigClient {
  /**
   * Gracefully shut down the SDK.
   * Stops background refresh timers and cleans up listeners.
   * Call this on server shutdown (SIGTERM handler, etc.)
   */
  close(): void;
}

/**
 * Initialize the server-side feature flags SDK.
 *
 * Returns a Promise that resolves once flags are fetched from the API.
 * This is a pessimistic strategy — your server won't serve requests
 * with stale/empty flags.
 *
 * @example
 * ```ts
 * import { initServerConfig, serverContext } from "@jewel998/config/server";
 * import { targetingPlugin } from "@jewel998/config/targeting";
 * import { rolloutPlugin } from "@jewel998/config/rollout";
 *
 * // Initialize once at server startup
 * const flags = await initServerConfig({
 *   clientId: "svr_xxx",
 *   baseUrl: "https://your-project.web.app/api",
 *   plugins: [targetingPlugin(), rolloutPlugin()],
 *   refreshInterval: 60_000, // re-fetch every minute
 * });
 *
 * // In request handlers:
 * app.get("/api/feature", (req, res) => {
 *   flags.setContext(serverContext({
 *     userId: req.user.id,
 *     plan: req.user.plan,
 *   }));
 *
 *   res.json({
 *     newCheckout: flags.getFlag("feature.checkout_v2"),
 *     uploadLimit: flags.getValue("app.upload_limit", 50),
 *   });
 * });
 *
 * // Graceful shutdown
 * process.on("SIGTERM", () => flags.close());
 * ```
 */
export async function initServerConfig(options: InitServerConfigOptions): Promise<ServerFlags> {
  // ── Validation ─────────────────────────────────────────────
  if (!options.clientId) {
    throw new ConfigError("clientId is required", "MISSING_CLIENT_ID");
  }

  if (!options.clientId.startsWith("svr_")) {
    throw new ConfigError(
      "Server SDK requires a server key (svr_ prefix). " +
        "Client keys (cid_) are for the browser SDK — they don't return " +
        "full flag data needed for local evaluation.",
      "INITIALIZATION_FAILED",
    );
  }

  // ── Resolve defaults ───────────────────────────────────────
  const baseUrl = options.baseUrl ?? "https://jewel998-config.web.app/api";
  const granularity = options.fetchGranularity ?? "batch";
  const storage = options.storage ?? memoryStorage();
  const retry: Required<RetryConfig> = { ...DEFAULT_RETRY, ...options.retry };
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const refreshInterval = options.refreshInterval ?? 0;
  const plugins = options.plugins ?? [];

  // Server keys always evaluate locally (client mode)
  const evaluationMode = "client" as const;

  // Mutable context reference
  let currentContext: EvaluationContext = options.context ?? {};

  // ── Create internal modules ────────────────────────────────
  const transport = createHttpTransport({
    baseUrl,
    clientId: options.clientId,
    evaluationMode,
    getContext: () => currentContext,
  });
  const events = new TypedEventEmitter();
  const fetcher =
    granularity === "batch" ? createBatchFetcher(transport) : createProjectedFetcher(transport);

  // ── Pessimistic load — await flags before returning ────────
  const loadResult = await executePessimistic({
    clientId: options.clientId,
    fetcher,
    cache: storage,
    events,
    retry,
    timeout,
    granularity,
  });

  // ── Build the config client ────────────────────────────────
  const client = buildConfigClient({
    data: loadResult.initialData,
    cache: storage,
    fetcher,
    events,
    retry,
    granularity,
    isDeferred: false,
    plugins,
    context: options.context,
    evaluationMode,
    onContextChange: (ctx) => {
      currentContext = ctx;
    },
  });

  events.emit("ready", {
    loadingStrategy: "pessimistic",
    cachedKeys: Object.keys(loadResult.initialData).length,
  });

  // ── Background refresh (optional) ─────────────────────────
  let refreshTimer: ReturnType<typeof setInterval> | null = null;

  if (refreshInterval > 0) {
    refreshTimer = setInterval(() => {
      void client.refresh();
    }, refreshInterval);

    // Ensure the timer doesn't prevent Node.js process from exiting.
    // In Node.js, setInterval returns an object with .unref().
    // We use a safe dynamic check to avoid depending on @types/node.
    const timer = refreshTimer as unknown as { unref?: () => void };
    if (typeof timer.unref === "function") {
      timer.unref();
    }
  }

  // ── Return ServerFlags (extends ConfigClient + close()) ────
  const serverFlags: ServerFlags = {
    getValue: client.getValue,
    getFlag: client.getFlag,
    getAll: client.getAll,
    refresh: client.refresh,
    setContext: client.setContext,
    on: client.on,
    off: client.off,

    destroy(): void {
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
      client.destroy();
    },

    close(): void {
      serverFlags.destroy();
    },
  };

  return serverFlags;
}
