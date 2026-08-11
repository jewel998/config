import { memoryStorage } from "./cache/memoryStorage";
import { buildConfigClient } from "./client/ConfigClient";
import { ConfigError } from "./errors/index";
import { TypedEventEmitter } from "./events/EventEmitter";
import { createBatchFetcher } from "./fetch/batchFetcher";
import { createProjectedFetcher } from "./fetch/projectedFetcher";
import { executeDeferred } from "./loading/deferred";
import { executeOptimistic } from "./loading/optimistic";
import { executePessimistic } from "./loading/pessimistic";
import type { EvaluationContext } from "./plugins/types";
import { createHttpTransport } from "./transport/HttpTransport";
import type {
  ConfigClient,
  CreateConfigOptions,
  LoadingContext,
} from "./types";
import { DEFAULT_RETRY, DEFAULT_TIMEOUT } from "./types";

const DEFAULT_BASE_URL = "https://jewel998-config.web.app/api";

export function createConfig(
  options: CreateConfigOptions & { loadingStrategy: "pessimistic" },
): Promise<ConfigClient>;
export function createConfig(options: CreateConfigOptions): ConfigClient;
export function createConfig(
  options: CreateConfigOptions,
): ConfigClient | Promise<ConfigClient> {
  // 1. Validate clientId
  if (!options.clientId) {
    throw new ConfigError("clientId is required", "MISSING_CLIENT_ID");
  }

  // 2. Check browser environment
  if (typeof window === "undefined") {
    throw new ConfigError(
      "@jewel998/config is browser-only. Server-side usage is not supported.",
      "INITIALIZATION_FAILED",
    );
  }

  // 3. Resolve defaults
  const strategy = options.loadingStrategy ?? "optimistic";
  const granularity = options.fetchGranularity ?? "batch";
  const storage = options.storage ?? memoryStorage();
  const retry = { ...DEFAULT_RETRY, ...options.retry };
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const evaluationMode = options.evaluationMode ?? "server";

  // 4. Maintain a mutable context reference for server mode
  let currentContext: EvaluationContext = options.context ?? {};

  // 5. Create internal modules
  const transport = createHttpTransport({
    baseUrl,
    clientId: options.clientId,
    evaluationMode,
    getContext: () => currentContext,
  });
  const events = new TypedEventEmitter();
  const fetcher =
    granularity === "batch"
      ? createBatchFetcher(transport)
      : createProjectedFetcher(transport);

  // 6. Create loading context
  const context: LoadingContext = {
    clientId: options.clientId,
    fetcher,
    cache: storage,
    events,
    retry,
    timeout,
    granularity,
  };

  // 7. In server mode, plugins are not needed (API resolves everything)
  const plugins = evaluationMode === "client" ? options.plugins : undefined;

  // 8. Execute strategy
  if (strategy === "pessimistic") {
    return executePessimistic(context).then((result) => {
      const client = buildConfigClient({
        data: result.initialData,
        cache: storage,
        fetcher,
        events,
        retry,
        granularity,
        isDeferred: false,
        plugins,
        context: options.context,
        consentAware: options.consentAware,
        evaluationMode,
        onContextChange: (ctx) => {
          currentContext = ctx;
        },
      });
      events.emit("ready", {
        loadingStrategy: "pessimistic",
        cachedKeys: Object.keys(result.initialData).length,
      });
      return client;
    });
  }

  if (strategy === "deferred") {
    const result = executeDeferred();
    const client = buildConfigClient({
      data: result.initialData,
      cache: storage,
      fetcher,
      events,
      retry,
      granularity,
      isDeferred: true,
      plugins,
      context: options.context,
      consentAware: options.consentAware,
      evaluationMode,
      onContextChange: (ctx) => {
        currentContext = ctx;
      },
    });
    events.emit("ready", {
      loadingStrategy: "deferred",
      cachedKeys: 0,
    });
    return client;
  }

  // Default: optimistic
  const result = executeOptimistic(context);
  const client = buildConfigClient({
    data: result.initialData,
    cache: storage,
    fetcher,
    events,
    retry,
    granularity,
    isDeferred: false,
    plugins,
    context: options.context,
    consentAware: options.consentAware,
    evaluationMode,
    onContextChange: (ctx) => {
      currentContext = ctx;
    },
  });
  events.emit("ready", {
    loadingStrategy: "optimistic",
    cachedKeys: Object.keys(result.initialData).length,
  });
  return client;
}
