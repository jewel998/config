// ═══════════════════════════════════════════════════════════════
// Core SDK Types
// ═══════════════════════════════════════════════════════════════

import type { EvaluationContext, EvaluationPlugin } from "./plugins/types.js";

/** Loading strategy for SDK initialization */
export type LoadingStrategy = "optimistic" | "pessimistic" | "deferred";

/** Fetch granularity for remote config retrieval */
export type FetchGranularity = "batch" | "projected";

/** Default cache TTL: 7 days in milliseconds */
export const DEFAULT_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 604_800_000 ms

/** Default pessimistic timeout in milliseconds */
export const DEFAULT_TIMEOUT = 10_000;

// ═══════════════════════════════════════════════════════════════
// Configuration Options
// ═══════════════════════════════════════════════════════════════

export interface CreateConfigOptions {
  /** Required. The clientId token generated in the Portal. */
  clientId: string;

  /**
   * Loading strategy for initialization.
   * - "optimistic" (default): Sync return, background fetch
   * - "pessimistic": Async, blocks until fetch completes
   * - "deferred": Sync return, lazy fetch on first access
   */
  loadingStrategy?: LoadingStrategy;

  /**
   * Fetch granularity for remote config retrieval.
   * - "batch" (default): Fetch all keys in one request
   * - "projected": Fetch only requested keys on demand
   */
  fetchGranularity?: FetchGranularity;

  /** Cache storage adapter. Default: memoryStorage() */
  storage?: CacheStorage;

  /** Retry configuration for failed fetches */
  retry?: RetryConfig;

  /** Timeout for pessimistic loading (ms). Default: 10000 */
  timeout?: number;

  /** Cloud Function base URL (override for testing/custom deployments) */
  baseUrl?: string;

  /** Evaluation plugins to register (tree-shakeable pipeline steps) */
  plugins?: EvaluationPlugin[];

  /** Evaluation context for plugin pipeline (can be updated post-init via setContext) */
  context?: EvaluationContext;

  /** Enable consent-aware mode (GDPR): if true and context.consentGranted !== true, returns defaults */
  consentAware?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// ConfigClient Interface
// ═══════════════════════════════════════════════════════════════

export interface ConfigClient {
  /** Get a typed config value by key. */
  getValue<T = unknown>(key: string): T | undefined;
  getValue<T = unknown>(key: string, defaultValue: T): T;

  /** Get a boolean flag by key. Returns false if missing. */
  getFlag(key: string): boolean;

  /** Get all config key-value pairs. */
  getAll(): Record<string, unknown>;

  /** Force refresh from remote. Updates cache and emits 'updated'. */
  refresh(): Promise<void>;

  /** Update the evaluation context (used by plugins for targeting, rollout, etc.) */
  setContext(newContext: EvaluationContext): void;

  /** Subscribe to a lifecycle event. */
  on<E extends ConfigEventType>(
    event: E,
    callback: ConfigEventCallback<E>,
  ): void;

  /** Unsubscribe from a lifecycle event. */
  off<E extends ConfigEventType>(
    event: E,
    callback: ConfigEventCallback<E>,
  ): void;
}

// ═══════════════════════════════════════════════════════════════
// Retry Configuration
// ═══════════════════════════════════════════════════════════════

export interface RetryConfig {
  /** Maximum number of retry attempts. Default: 3 */
  maxRetries?: number;

  /** Base delay in milliseconds. Default: 1000 */
  baseDelay?: number;

  /** Backoff multiplier. Default: 2 (exponential) */
  multiplier?: number;

  /** Maximum delay cap in milliseconds. Default: 30000 */
  maxDelay?: number;
}

export const DEFAULT_RETRY: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelay: 1000,
  multiplier: 2,
  maxDelay: 30_000,
};

// ═══════════════════════════════════════════════════════════════
// Cache Storage
// ═══════════════════════════════════════════════════════════════

export interface CacheStorage {
  /** Get a value by key. Returns undefined if missing or TTL expired. */
  get<T>(key: string): T | undefined;

  /** Set a value with optional TTL override (ms). Default TTL: 7 days. */
  set<T>(key: string, value: T, ttl?: number): void;

  /** Delete a specific key from cache. */
  delete(key: string): void;

  /** Clear all cached values. */
  clear(): void;
}

export interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
}

export interface BrowserStorageOptions {
  /** localStorage key prefix. Default: "@jewel998/config" */
  prefix?: string;
  /** Default TTL in milliseconds. Default: 604800000 (7 days) */
  defaultTtl?: number;
}

// ═══════════════════════════════════════════════════════════════
// Event System
// ═══════════════════════════════════════════════════════════════

export type ConfigEventType = "ready" | "updated" | "fetchError" | "revoked";

export interface ConfigEventPayloads {
  ready: { loadingStrategy: LoadingStrategy; cachedKeys: number };
  updated: { keys: string[]; source: "background" | "refresh" };
  fetchError: { error: Error; retryCount: number; willRetry: boolean };
  revoked: { clientId: string; message: string };
}

export type ConfigEventCallback<E extends ConfigEventType> = (
  payload: ConfigEventPayloads[E],
) => void;

// ═══════════════════════════════════════════════════════════════
// Internal Interfaces (Loading Strategy)
// ═══════════════════════════════════════════════════════════════

export interface LoadingContext {
  clientId: string;
  fetcher: ConfigFetcher;
  cache: CacheStorage;
  events: EventEmitterInterface;
  retry: Required<RetryConfig>;
  timeout: number;
  granularity: FetchGranularity;
}

export interface LoadingResult {
  initialData: Record<string, unknown>;
  status: "ready" | "pending";
}

export interface LoadingStrategyHandler {
  execute(context: LoadingContext): LoadingResult | Promise<LoadingResult>;
}

// ═══════════════════════════════════════════════════════════════
// Internal Interfaces (Fetch)
// ═══════════════════════════════════════════════════════════════

export interface ConfigFetcher {
  /** Fetch all configs for the bound project+environment */
  fetchAll(): Promise<Record<string, unknown>>;

  /** Fetch specific keys only */
  fetchKeys(keys: string[]): Promise<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════
// Internal Interfaces (Transport)
// ═══════════════════════════════════════════════════════════════

export interface HttpTransport {
  request<T>(endpoint: string, body?: Record<string, unknown>): Promise<T>;
}

// ═══════════════════════════════════════════════════════════════
// Cloud Function Request/Response
// ═══════════════════════════════════════════════════════════════

export interface GetConfigRequest {
  clientId: string;
  keys?: string[];
}

export interface GetConfigResponse {
  data: Record<string, unknown>;
  version: string;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════
// Internal Event Emitter Interface
// ═══════════════════════════════════════════════════════════════

export interface EventEmitterInterface {
  on<E extends ConfigEventType>(
    event: E,
    callback: ConfigEventCallback<E>,
  ): void;
  off<E extends ConfigEventType>(
    event: E,
    callback: ConfigEventCallback<E>,
  ): void;
  emit<E extends ConfigEventType>(
    event: E,
    payload: ConfigEventPayloads[E],
  ): void;
  removeAllListeners(): void;
}

// ═══════════════════════════════════════════════════════════════
// Legacy types (deprecated, kept for migration)
// ═══════════════════════════════════════════════════════════════

/** @deprecated Use CreateConfigOptions instead */
export type ConfigScope = "tenant" | "project" | "environment";

/** @deprecated Use LoadingStrategy instead */
export type ConfigSourceMode = "offline" | "remote" | "hybrid";

/** @deprecated Config definitions are no longer needed client-side */
export interface ConfigDefinition<T = unknown> {
  key: string;
  defaultValue: T;
  sourceMode: ConfigSourceMode;
  scope: ConfigScope;
  fallbackValue?: T;
}

/** @deprecated Scoping is handled by clientId */
export interface ConfigResolveContext {
  tenantId?: string;
  projectId?: string;
  environment?: string;
}

// ═══════════════════════════════════════════════════════════════
// Portal/Management types (used by Cloud Functions and Portal)
// ═══════════════════════════════════════════════════════════════

export interface ProjectRecord {
  id: string;
  name: string;
  ownerId: string;
  authorizedUsers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EnvironmentRecord {
  id: string;
  projectId: string;
  name: string;
  allowedDomains: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ClientIdRecord {
  token: string;
  status: "active" | "revoked";
  createdAt: string;
  revokedAt: string | null;
  createdBy: string;
  label?: string;
}

export interface ConfigRecord {
  key: string;
  value: unknown;
  valueType: "string" | "number" | "boolean" | "json";
  version: string;
  publishedAt: string;
  updatedAt: string;
  updatedBy: string;
}

/** @deprecated Use ProjectRecord instead */
export interface TenantRecord {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

/** @deprecated Use ConfigRecord instead */
export interface ConfigVersionRecord {
  id: string;
  projectId: string;
  environmentId?: string;
  version: string;
  payload: Record<string, unknown>;
  publishedAt?: string;
}
