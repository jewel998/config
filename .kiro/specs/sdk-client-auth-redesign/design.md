# Technical Design: SDK Client Auth Redesign

## Overview

This document describes the technical architecture for the `@jewel998/config` SDK redesign. The redesign replaces the current `createConfigClient` pattern (which requires explicit definitions, storage adapters, and remote providers) with a `clientId`-based initialization model.

**Key changes:**

- Tenant concept removed — Projects are top-level entities
- SDK authenticates via `clientId` (public, per-environment token)
- Cloud Function proxy validates clientId + origin, returns scoped config
- Three loading strategies: optimistic, pessimistic, deferred
- Two fetch granularities: batch, projected
- Event-driven lifecycle (ready, updated, fetchError, revoked)
- Browser-only (no Node.js support)

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client Application (Browser)                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    @jewel998/config SDK                        │  │
│  │                                                               │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐   │  │
│  │  │ ConfigClient │  │ EventEmitter │  │  Loading Strategy  │   │  │
│  │  │ getValue()   │  │ on/off/emit  │  │  Engine            │   │  │
│  │  │ getFlag()    │  │              │  │  (opt/pess/defer)  │   │  │
│  │  │ getAll()     │  └──────────────┘  └────────────────────┘   │  │
│  │  │ refresh()    │                                             │  │
│  │  └──────┬───────┘                                             │  │
│  │         │                                                     │  │
│  │  ┌──────▼───────┐  ┌──────────────┐  ┌────────────────────┐  │  │
│  │  │ Cache Layer  │  │ Fetch Module │  │  Retry Engine      │  │  │
│  │  │ (TTL-aware)  │  │ batch/proj   │  │  (exp. backoff)    │  │  │
│  │  └──────────────┘  └──────┬───────┘  └────────────────────┘  │  │
│  │                           │                                   │  │
│  └───────────────────────────┼───────────────────────────────────┘  │
│                              │ HTTPS                                 │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    Firebase Cloud Functions                           │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  getConfig (HTTP endpoint)                                     │  │
│  │  ┌─────────────┐ ┌──────────────┐ ┌────────────┐ ┌─────────┐ │  │
│  │  │ Validate    │ │ Check Origin │ │ Rate Limit │ │ Return  │ │  │
│  │  │ ClientId    │ │ vs Allowed   │ │ per        │ │ Scoped  │ │  │
│  │  │ (active?)   │ │ Domains      │ │ ClientId   │ │ Config  │ │  │
│  │  └─────────────┘ └──────────────┘ └────────────┘ └─────────┘ │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                              │                                        │
└──────────────────────────────┼────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         Firestore                                     │
│                                                                      │
│  /projects/{projectId}                                               │
│  /projects/{projectId}/environments/{envId}                          │
│  /projects/{projectId}/environments/{envId}/clientIds/{clientId}     │
│  /projects/{projectId}/environments/{envId}/configs/{configId}       │
└──────────────────────────────────────────────────────────────────────┘
```

## Data Models

### 3.1 Collection Structure

```
/projects/{projectId}
  ├── /environments/{environmentId}
  │     ├── /clientIds/{clientIdToken}
  │     └── /configs/{configKey}
  └── (project-level metadata)
```

### 3.2 Document Schemas

#### Projects Collection: `/projects/{projectId}`

```typescript
interface ProjectDocument {
  id: string; // Auto-generated document ID
  name: string; // e.g., "dashboard", "billing-app"
  ownerId: string; // Firebase Auth UID of the creator
  authorizedUsers: string[]; // Array of Firebase Auth UIDs with access
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}
```

#### Environments Collection: `/projects/{projectId}/environments/{environmentId}`

```typescript
interface EnvironmentDocument {
  id: string; // Auto-generated document ID
  name: string; // e.g., "development", "staging", "production"
  allowedDomains: string[]; // e.g., ["app.example.com", "localhost"]
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}
```

#### ClientIds Collection: `/projects/{projectId}/environments/{environmentId}/clientIds/{clientIdToken}`

```typescript
interface ClientIdDocument {
  token: string; // The clientId string (also used as doc ID)
  status: "active" | "revoked"; // Current status
  createdAt: string; // ISO 8601 timestamp
  revokedAt: string | null; // ISO 8601 timestamp or null
  createdBy: string; // Firebase Auth UID of creator
  label?: string; // Optional human-readable label
}
```

#### Published Configs Collection: `/projects/{projectId}/environments/{environmentId}/configs/{configKey}`

```typescript
interface ConfigDocument {
  key: string; // Config key (also used as doc ID)
  value: unknown; // The config value (any JSON-serializable type)
  valueType: "string" | "number" | "boolean" | "json"; // Type hint
  version: string; // Semantic version or incremental ID
  publishedAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
  updatedBy: string; // Firebase Auth UID of last editor
}
```

### 3.3 Indexes

```
// Composite index for clientId lookup (used by Cloud Function)
Collection: collectionGroup "clientIds"
Fields: token ASC, status ASC

// Configs ordered by update time (for change detection)
Collection: configs (under each environment)
Fields: updatedAt DESC
```

### 3.4 Example Document Tree

```
/projects/proj_abc123
  name: "dashboard"
  ownerId: "uid_owner1"
  authorizedUsers: ["uid_owner1", "uid_dev2"]
  createdAt: "2025-01-15T10:00:00Z"
  updatedAt: "2025-01-15T10:00:00Z"

  /environments/env_staging
    name: "staging"
    allowedDomains: ["staging.dashboard.com", "localhost"]
    createdAt: "2025-01-15T10:05:00Z"
    updatedAt: "2025-01-15T10:05:00Z"

    /clientIds/cid_xK9m2pLqR7
      token: "cid_xK9m2pLqR7"
      status: "active"
      createdAt: "2025-01-15T10:06:00Z"
      revokedAt: null
      createdBy: "uid_owner1"
      label: "staging-primary"

    /configs/feature_newUI
      key: "feature_newUI"
      value: true
      valueType: "boolean"
      version: "3"
      publishedAt: "2025-01-20T14:30:00Z"
      updatedAt: "2025-01-20T14:30:00Z"
      updatedBy: "uid_dev2"

    /configs/api_timeout
      key: "api_timeout"
      value: 5000
      valueType: "number"
      version: "1"
      publishedAt: "2025-01-15T11:00:00Z"
      updatedAt: "2025-01-15T11:00:00Z"
      updatedBy: "uid_owner1"
```

## Components and Interfaces

### 4.1 Entry Point — `createConfig()`

```typescript
/**
 * Creates a new ConfigClient instance authenticated via clientId.
 * Browser-only. Logs "[Alpha]" prefix during initialization.
 *
 * @example
 * // Optimistic (default) — instant start, background sync
 * const config = createConfig({ clientId: "cid_xK9m2pLqR7" });
 *
 * // Pessimistic — await full fetch before use
 * const config = await createConfig({
 *   clientId: "cid_xK9m2pLqR7",
 *   loadingStrategy: "pessimistic",
 * });
 *
 * // Deferred — lazy fetch on first access
 * const config = createConfig({
 *   clientId: "cid_xK9m2pLqR7",
 *   loadingStrategy: "deferred",
 * });
 */
export function createConfig(options: CreateConfigOptions): ConfigClient;
export function createConfig(
  options: CreateConfigOptions & { loadingStrategy: "pessimistic" },
): Promise<ConfigClient>;
export function createConfig(
  options: CreateConfigOptions,
): ConfigClient | Promise<ConfigClient>;
```

### 4.2 Configuration Options

```typescript
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
}

export type LoadingStrategy = "optimistic" | "pessimistic" | "deferred";
export type FetchGranularity = "batch" | "projected";
```

### 4.3 ConfigClient Interface

```typescript
export interface ConfigClient {
  /**
   * Get a typed config value by key.
   * Returns cached value, remote value, or undefined.
   * In deferred mode with projected granularity, returns a Promise.
   */
  getValue<T = unknown>(key: string): T | undefined;
  getValue<T = unknown>(key: string, defaultValue: T): T;

  /**
   * Get a boolean flag by key. Convenience wrapper over getValue.
   * Returns false if key is missing or not a boolean.
   */
  getFlag(key: string): boolean;

  /**
   * Get all config key-value pairs for the scoped environment.
   * In deferred mode, triggers a batch fetch if not yet loaded.
   */
  getAll(): Record<string, unknown>;

  /**
   * Force refresh from remote. Updates cache and emits 'updated'.
   * Returns a Promise that resolves when refresh is complete.
   */
  refresh(): Promise<void>;

  /**
   * Subscribe to a lifecycle event.
   */
  on<E extends ConfigEventType>(
    event: E,
    callback: ConfigEventCallback<E>,
  ): void;

  /**
   * Unsubscribe from a lifecycle event.
   */
  off<E extends ConfigEventType>(
    event: E,
    callback: ConfigEventCallback<E>,
  ): void;
}
```

### 4.4 Retry Configuration

```typescript
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

// Internal defaults
const DEFAULT_RETRY: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelay: 1000,
  multiplier: 2,
  maxDelay: 30000,
};
```

### 4.5 Cache Storage Interface (Updated with TTL)

```typescript
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

/** Default cache TTL: 7 days in milliseconds */
const DEFAULT_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 604_800_000 ms
```

### 4.6 Event System Types

```typescript
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
```

### 4.7 Built-in Storage Adapters

```typescript
/**
 * In-memory storage with TTL support.
 * Data is lost on page refresh. Suitable for SPAs with short sessions.
 */
export function memoryStorage(): CacheStorage;

/**
 * localStorage-backed storage with TTL support.
 * Persists across page refreshes and browser restarts.
 * Falls back to memoryStorage() in non-browser environments.
 */
export function browserStorage(options?: BrowserStorageOptions): CacheStorage;

export interface BrowserStorageOptions {
  /** localStorage key prefix. Default: "@jewel998/config" */
  prefix?: string;
  /** Default TTL in milliseconds. Default: 604800000 (7 days) */
  defaultTtl?: number;
}
```

### 4.8 Error Types

```typescript
export class ConfigError extends Error {
  constructor(
    message: string,
    public code: ConfigErrorCode,
  ) {
    super(message);
    this.name = "ConfigError";
  }
}

export class InitializationError extends ConfigError {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message, "INITIALIZATION_FAILED");
    this.name = "InitializationError";
  }
}

export class TimeoutError extends ConfigError {
  constructor(timeoutMs: number) {
    super(`Config initialization timed out after ${timeoutMs}ms`, "TIMEOUT");
    this.name = "TimeoutError";
  }
}

export class AuthenticationError extends ConfigError {
  constructor(message: string) {
    super(message, "AUTHENTICATION_FAILED");
    this.name = "AuthenticationError";
  }
}

export type ConfigErrorCode =
  | "MISSING_CLIENT_ID"
  | "AUTHENTICATION_FAILED"
  | "INITIALIZATION_FAILED"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "REVOKED"
  | "NETWORK_ERROR";
```

## Error Handling

### Error Classification

| Error Type            | Code                    | Retryable          | Description                        |
| --------------------- | ----------------------- | ------------------ | ---------------------------------- |
| `ConfigError`         | `MISSING_CLIENT_ID`     | No                 | No clientId provided               |
| `AuthenticationError` | `AUTHENTICATION_FAILED` | No                 | ClientId invalid or revoked        |
| `InitializationError` | `INITIALIZATION_FAILED` | Yes                | Network/server failure during init |
| `TimeoutError`        | `TIMEOUT`               | No                 | Pessimistic init exceeded timeout  |
| `ConfigError`         | `RATE_LIMITED`          | Yes (after window) | 429 from Cloud Function            |
| `ConfigError`         | `REVOKED`               | No                 | ClientId revoked mid-session       |
| `ConfigError`         | `NETWORK_ERROR`         | Yes                | Fetch failure (offline, DNS, etc.) |

### Error Recovery Strategy

- **Non-retryable errors** (auth, revoked, missing clientId): Throw immediately, no retry.
- **Retryable errors** (network, server 5xx, init failure): Apply exponential backoff with jitter. Default: 3 retries, 1s base, 2x multiplier, 30s max.
- **Rate limit (429)**: Do not retry immediately. Wait until the next rate limit window (60s) expires. Emit `fetchError` event.
- **Timeout**: For pessimistic mode only. Rejects the init promise. Caller decides fallback.

### Error Propagation

- In **optimistic** mode: Errors during background fetch are swallowed (emitted as events, not thrown).
- In **pessimistic** mode: Errors reject the init Promise (caller must handle).
- In **deferred** mode: Errors on `getValue()` return `undefined` (or default) and emit `fetchError` event.

## Correctness Properties

### Property 1: Scope Isolation

A clientId can ONLY return configs for its bound project+environment. The Cloud Function enforces this at the data layer — it resolves project+environment from the clientId's Firestore path and queries only that environment's configs subcollection.

**Validates: Requirements 1.1, 2.2, 10.2**

### Property 2: Cache Consistency

Cache is always overwritten atomically (not merged) on fetch. Stale reads are bounded by the 7-day TTL. When TTL expires, the entry is treated as a miss.

**Validates: Requirements 11.2, 11.3, 11.4**

### Property 3: Event Ordering

The `ready` event is always emitted before `updated`. The `revoked` event can occur at any time after `ready`. No events are emitted if initialization fails (pessimistic rejects the Promise instead).

**Validates: Requirements 12.3**

### Property 4: Idempotent Reads

`getValue(key)` always returns the same value within a single synchronous frame. Background fetch updates take effect on the next event loop turn, not mid-frame.

**Validates: Requirements 5.1, 7.1**

### Property 5: Revocation Propagation

Within 60 seconds of revocation in the Portal, all SDK requests with that clientId will receive a 401 and emit `revoked`. The SDK does not cache the revocation status — each request is validated server-side.

**Validates: Requirements 2.3, 10.4**

## Testing Strategy

### Unit Tests (Vitest)

- **createConfig:** Validates clientId requirement, browser-only check, strategy selection, default resolution.
- **Loading strategies:** Each strategy tested in isolation with mocked fetcher. Verify correct async/sync behavior, cache population, event emission.
- **Cache layer:** TTL expiration, get/set/delete/clear for both memoryStorage and browserStorage.
- **Retry engine:** Exponential backoff timing, jitter bounds, non-retryable error short-circuit.
- **Event emitter:** on/off/emit correctness, error isolation in callbacks.
- **Projected fetcher:** Microtask batching (multiple getValue calls in same tick → single request).

### Integration Tests

- **Cloud Function (`getConfig`):** Test with valid/invalid/revoked clientId, origin validation, rate limiting, projected vs batch responses.
- **End-to-end:** SDK → Cloud Function → Firestore round-trip with each loading strategy.

### Security Tests

- **ClientId scope enforcement:** Verify a clientId cannot read configs from a different project or environment.
- **Origin validation:** Verify requests from non-allowed domains are rejected.
- **Revocation:** Verify revoked clientId is rejected within 60s window.

## 5. Internal SDK Architecture

### 5.1 Module Structure

```
packages/config/src/
├── index.ts                    # Public exports
├── createConfig.ts             # Entry point factory function
├── client/
│   └── ConfigClient.ts         # ConfigClient implementation
├── loading/
│   ├── types.ts                # Strategy interface
│   ├── optimistic.ts           # Optimistic strategy
│   ├── pessimistic.ts          # Pessimistic strategy
│   └── deferred.ts             # Deferred strategy
├── fetch/
│   ├── types.ts                # Fetcher interface
│   ├── batchFetcher.ts         # Batch fetch implementation
│   └── projectedFetcher.ts     # Projected fetch implementation
├── cache/
│   ├── types.ts                # CacheStorage interface
│   ├── memoryStorage.ts        # In-memory with TTL
│   └── browserStorage.ts       # localStorage with TTL
├── events/
│   └── EventEmitter.ts         # Typed event emitter
├── retry/
│   └── RetryEngine.ts          # Exponential backoff retry
├── errors/
│   └── index.ts                # Error classes
└── transport/
    └── HttpTransport.ts        # HTTP client for Cloud Function
```

### 5.2 Internal Interfaces

```typescript
// --- Loading Strategy Interface ---
interface LoadingStrategyHandler {
  /**
   * Execute the loading strategy.
   * Returns the initial state (cache snapshot) for the ConfigClient.
   * For pessimistic, this is async and blocks.
   * For optimistic/deferred, this is sync and returns immediately.
   */
  execute(context: LoadingContext): LoadingResult | Promise<LoadingResult>;
}

interface LoadingContext {
  clientId: string;
  fetcher: ConfigFetcher;
  cache: CacheStorage;
  events: TypedEventEmitter;
  retry: Required<RetryConfig>;
  timeout?: number;
}

interface LoadingResult {
  initialData: Record<string, unknown>;
  status: "ready" | "pending";
}

// --- Fetcher Interface ---
interface ConfigFetcher {
  /** Fetch all configs for the bound project+environment */
  fetchAll(): Promise<Record<string, unknown>>;

  /** Fetch specific keys only */
  fetchKeys(keys: string[]): Promise<Record<string, unknown>>;
}

// --- HTTP Transport ---
interface HttpTransport {
  request<T>(endpoint: string, body: unknown): Promise<T>;
}
```

### 5.3 Initialization Flow (createConfig)

```typescript
// Pseudocode for createConfig()
function createConfig(
  options: CreateConfigOptions,
): ConfigClient | Promise<ConfigClient> {
  // 1. Validate inputs
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

  // 3. Log alpha prefix
  console.log("[Alpha] @jewel998/config initializing...");

  // 4. Resolve defaults
  const strategy = options.loadingStrategy ?? "optimistic";
  const granularity = options.fetchGranularity ?? "batch";
  const storage = options.storage ?? memoryStorage();
  const retry = { ...DEFAULT_RETRY, ...options.retry };
  const timeout = options.timeout ?? 10_000;

  // 5. Create internal modules
  const transport = createHttpTransport(CLOUD_FUNCTION_URL);
  const events = createEventEmitter();
  const fetcher =
    granularity === "batch"
      ? createBatchFetcher(transport, options.clientId)
      : createProjectedFetcher(transport, options.clientId);

  // 6. Create loading context
  const context: LoadingContext = {
    clientId: options.clientId,
    fetcher,
    cache: storage,
    events,
    retry,
    timeout,
  };

  // 7. Execute strategy
  if (strategy === "pessimistic") {
    return executePessimistic(context).then((result) =>
      buildClient(result, storage, fetcher, events),
    );
  }

  if (strategy === "deferred") {
    const result = executeDeferred(context);
    return buildClient(result, storage, fetcher, events);
  }

  // Default: optimistic
  const result = executeOptimistic(context);
  return buildClient(result, storage, fetcher, events);
}
```

## 6. Loading Strategy Implementations

### 6.1 Optimistic Strategy

```
┌──────────┐     ┌─────────────┐     ┌──────────────┐     ┌──────────┐
│ createConfig │──▶│ Read Cache  │──▶│ Return Client │──▶│ emit      │
│ (sync)       │   │ (if valid   │   │ (immediate)   │   │ "ready"   │
└──────────┘     │  TTL)        │   └───────┬────────┘   └──────────┘
                  └─────────────┘           │
                                            │ (async, non-blocking)
                                            ▼
                                  ┌──────────────────┐
                                  │ Background Fetch │
                                  │ (with retry)     │
                                  └────────┬─────────┘
                                           │
                              ┌────────────┴────────────┐
                              ▼                         ▼
                    ┌──────────────┐          ┌──────────────────┐
                    │ Success:     │          │ Failure:         │
                    │ Update cache │          │ emit "fetchError"│
                    │ emit "updated│          │ Keep cached/     │
                    └──────────────┘          │ default values   │
                                              └──────────────────┘
```

```typescript
// Pseudocode
function executeOptimistic(ctx: LoadingContext): LoadingResult {
  // Synchronously read from cache (may be empty on first run)
  const cached = ctx.cache.get<Record<string, unknown>>("__all__");
  const initialData = cached ?? {};

  // Fire background fetch (non-blocking)
  scheduleBackgroundFetch(ctx);

  return { initialData, status: "ready" };
}

async function scheduleBackgroundFetch(ctx: LoadingContext): Promise<void> {
  try {
    const data = await withRetry(() => ctx.fetcher.fetchAll(), ctx.retry);
    ctx.cache.set("__all__", data, DEFAULT_CACHE_TTL);

    // Also cache individual keys for projected access
    for (const [key, value] of Object.entries(data)) {
      ctx.cache.set(key, value, DEFAULT_CACHE_TTL);
    }

    ctx.events.emit("updated", {
      keys: Object.keys(data),
      source: "background",
    });
  } catch (error) {
    ctx.events.emit("fetchError", {
      error: error as Error,
      retryCount: ctx.retry.maxRetries,
      willRetry: false,
    });
  }
}
```

### 6.2 Pessimistic Strategy

```
┌───────────────┐     ┌──────────────┐     ┌────────────────┐
│ createConfig  │──▶│ Fetch Remote  │──▶│ Populate Cache  │
│ (returns      │   │ (await, with  │   │ Return Client   │
│  Promise)     │   │  retry+timeout│   │ emit "ready"    │
└───────────────┘   └──────┬────────┘   └────────────────┘
                           │
              ┌────────────┴────────────────┐
              ▼                             ▼
    ┌──────────────────┐        ┌─────────────────────┐
    │ Timeout (10s):   │        │ All retries fail:   │
    │ reject with      │        │ reject with         │
    │ TimeoutError     │        │ InitializationError │
    └──────────────────┘        └─────────────────────┘
```

```typescript
// Pseudocode
async function executePessimistic(ctx: LoadingContext): Promise<LoadingResult> {
  const timeoutMs = ctx.timeout ?? 10_000;

  const fetchPromise = withRetry(() => ctx.fetcher.fetchAll(), ctx.retry);

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new TimeoutError(timeoutMs)), timeoutMs);
  });

  try {
    const data = await Promise.race([fetchPromise, timeoutPromise]);

    // Populate cache
    ctx.cache.set("__all__", data, DEFAULT_CACHE_TTL);
    for (const [key, value] of Object.entries(data)) {
      ctx.cache.set(key, value, DEFAULT_CACHE_TTL);
    }

    return { initialData: data, status: "ready" };
  } catch (error) {
    if (error instanceof TimeoutError) {
      throw error;
    }
    throw new InitializationError(
      "Failed to fetch config after all retries",
      error as Error,
    );
  }
}
```

### 6.3 Deferred Strategy

```
┌───────────────┐     ┌──────────────────┐
│ createConfig  │──▶│ Return empty      │──▶ emit "ready"
│ (sync, no     │   │ Client immediately │
│  network)     │   └──────────────────┘
└───────────────┘
                          ... later ...

┌──────────────────┐     ┌──────────────────┐     ┌─────────────┐
│ getValue("key")  │──▶│ Cache miss?       │──▶│ Fetch remote │
│ (first access)   │   │ Trigger fetch     │   │ (with retry) │
└──────────────────┘   └──────────────────┘   └──────┬────────┘
                                                      │
                                         ┌────────────┴──────────┐
                                         ▼                       ▼
                               ┌──────────────────┐   ┌──────────────────┐
                               │ Success:         │   │ Failure:         │
                               │ Cache + return   │   │ Return default   │
                               │ emit "updated"   │   │ emit "fetchError"│
                               └──────────────────┘   └──────────────────┘
```

```typescript
// Pseudocode
function executeDeferred(ctx: LoadingContext): LoadingResult {
  // No network activity at init time
  return { initialData: {}, status: "ready" };
}

// Inside ConfigClient.getValue() for deferred mode:
function getDeferredValue<T>(key: string, ctx: LoadingContext): T | undefined {
  // 1. Check cache first
  const cached = ctx.cache.get<T>(key);
  if (cached !== undefined) {
    return cached;
  }

  // 2. If batch granularity, fetch all on first miss
  if (ctx.granularity === "batch" && !ctx._batchFetchTriggered) {
    ctx._batchFetchTriggered = true;
    // Fire and forget — data arrives async
    ctx.fetcher
      .fetchAll()
      .then((data) => {
        ctx.cache.set("__all__", data, DEFAULT_CACHE_TTL);
        for (const [k, v] of Object.entries(data)) {
          ctx.cache.set(k, v, DEFAULT_CACHE_TTL);
        }
        ctx.events.emit("updated", {
          keys: Object.keys(data),
          source: "background",
        });
      })
      .catch((err) => {
        ctx.events.emit("fetchError", {
          error: err,
          retryCount: 0,
          willRetry: false,
        });
      });
  }

  // 3. If projected granularity, fetch specific key
  if (ctx.granularity === "projected") {
    // Queue the key for microtask batching
    queueKeyFetch(key, ctx);
  }

  // 4. Return undefined (value arrives later via event)
  return undefined;
}
```

## 7. Fetch Granularity × Loading Strategy Matrix

| Strategy \ Granularity | **Batch**                                                                                                 | **Projected**                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Optimistic**         | Sync return with cache. Background fetches ALL keys in one request. Updates cache + emits `updated`.      | Sync return with cache. Background fetches ALL keys that were previously accessed (tracked). New keys lazy-fetched on access. |
| **Pessimistic**        | Awaits single request for ALL keys. Populates full cache. Resolves Promise.                               | Awaits fetch of all previously-known keys. Resolves Promise. New keys fetched on access.                                      |
| **Deferred**           | No fetch at init. First `getValue()` call triggers fetch of ALL keys. Subsequent calls return from cache. | No fetch at init. Each `getValue()` call fetches only that key (micro-batched within same tick).                              |

### Detailed Behavior Notes:

**Batch + Optimistic (Default):**

- Init: Read full cache → return client
- Background: `GET /config?clientId=xxx` → response contains all key-value pairs
- Cache write: Atomic update of all keys + `__all__` envelope
- Event: `updated` with full key list

**Batch + Pessimistic:**

- Init: `GET /config?clientId=xxx` → await response
- On success: Cache all → resolve with client
- On failure/timeout: reject Promise

**Batch + Deferred:**

- Init: Return empty client
- First access (any key): Triggers `GET /config?clientId=xxx`
- All subsequent access: Returns from cache (until TTL expires)

**Projected + Optimistic:**

- Init: Read whatever is in cache → return client
- Background: Fetch keys that are in cache (refresh them)
- New keys: Fetched on first access via `getValue()`

**Projected + Pessimistic:**

- Init: Fetch known keys (from previous session's cache keys list)
- On resolve: Client ready with fetched keys
- New keys: Fetched on first access

**Projected + Deferred:**

- Init: Return empty client (no fetch)
- Each `getValue()` call: Queues key for fetch
- Microtask batching: All keys requested in same tick → single request
- Request: `GET /config?clientId=xxx&keys=key1,key2,key3`

## 8. Cloud Functions API

### 8.1 Endpoint: `getConfig`

**Type:** Firebase Cloud Function (HTTP callable, v2)
**URL:** `https://<region>-<project>.cloudfunctions.net/getConfig`
**Method:** POST (Firebase callable convention)

#### Request

```typescript
interface GetConfigRequest {
  /** The clientId token */
  clientId: string;

  /**
   * Optional: specific keys to fetch (projected granularity).
   * If omitted, returns all configs for the environment.
   */
  keys?: string[];
}
```

#### Response

```typescript
interface GetConfigResponse {
  /** Key-value map of config data */
  data: Record<string, unknown>;

  /** Version identifier for cache invalidation */
  version: string;

  /** Server timestamp for sync tracking */
  timestamp: string;
}
```

#### Error Responses

| HTTP Status | Code                 | Condition                         |
| ----------- | -------------------- | --------------------------------- |
| 401         | `UNAUTHENTICATED`    | ClientId not found or revoked     |
| 403         | `PERMISSION_DENIED`  | Origin not in allowed domains     |
| 429         | `RESOURCE_EXHAUSTED` | Rate limit exceeded (100 req/min) |
| 400         | `INVALID_ARGUMENT`   | Missing clientId in request       |
| 500         | `INTERNAL`           | Unexpected server error           |

### 8.2 Implementation Pseudocode

```typescript
// Cloud Function: getConfig
export const getConfig = onRequest(
  { cors: true, region: "us-central1" },
  async (req, res) => {
    const { clientId, keys } = req.body.data;

    // 1. Validate clientId presence
    if (!clientId) {
      res
        .status(400)
        .json({
          error: { code: "INVALID_ARGUMENT", message: "clientId is required" },
        });
      return;
    }

    // 2. Look up clientId in Firestore (collectionGroup query)
    const db = getFirestore();
    const clientIdQuery = db
      .collectionGroup("clientIds")
      .where("token", "==", clientId)
      .where("status", "==", "active")
      .limit(1);

    const snapshot = await clientIdQuery.get();
    if (snapshot.empty) {
      res
        .status(401)
        .json({
          error: {
            code: "UNAUTHENTICATED",
            message: "Invalid or revoked clientId",
          },
        });
      return;
    }

    // 3. Extract project + environment from document path
    const clientIdDoc = snapshot.docs[0];
    const pathSegments = clientIdDoc.ref.path.split("/");
    // Path: projects/{projectId}/environments/{envId}/clientIds/{token}
    const projectId = pathSegments[1];
    const environmentId = pathSegments[3];

    // 4. Check origin against allowed domains
    const origin = req.headers.origin || req.headers.referer || "";
    const envDoc = await db
      .collection("projects")
      .doc(projectId)
      .collection("environments")
      .doc(environmentId)
      .get();

    const envData = envDoc.data();
    const allowedDomains: string[] = envData?.allowedDomains ?? [];

    if (!isOriginAllowed(origin, allowedDomains)) {
      res
        .status(403)
        .json({
          error: { code: "PERMISSION_DENIED", message: "Origin not allowed" },
        });
      return;
    }

    // 5. Rate limiting check (using in-memory counter or Redis/Firestore)
    if (await isRateLimited(clientId)) {
      res
        .status(429)
        .json({
          error: { code: "RESOURCE_EXHAUSTED", message: "Rate limit exceeded" },
        });
      return;
    }

    // 6. Fetch configs
    const configsRef = db
      .collection("projects")
      .doc(projectId)
      .collection("environments")
      .doc(environmentId)
      .collection("configs");

    let configSnapshot;
    if (keys && keys.length > 0) {
      // Projected: fetch only requested keys
      configSnapshot = await configsRef.where("key", "in", keys).get();
    } else {
      // Batch: fetch all
      configSnapshot = await configsRef.get();
    }

    const data: Record<string, unknown> = {};
    let latestVersion = "0";
    for (const doc of configSnapshot.docs) {
      const config = doc.data();
      data[config.key] = config.value;
      if (config.version > latestVersion) latestVersion = config.version;
    }

    // 7. Return scoped config
    res.status(200).json({
      data,
      version: latestVersion,
      timestamp: new Date().toISOString(),
    });
  },
);
```

### 8.3 Portal Management Functions (Updated)

These Cloud Functions replace the current tenant-scoped functions:

```typescript
// Projects (top-level, no tenant)
export const createProject = onCall(async (request) => {
  /* ... */
});
export const deleteProject = onCall(async (request) => {
  /* ... */
});
export const listProjects = onCall(async (request) => {
  /* ... */
});
export const inviteUser = onCall(async (request) => {
  /* ... */
});

// Environments (per project)
export const createEnvironment = onCall(async (request) => {
  /* ... */
});
export const deleteEnvironment = onCall(async (request) => {
  /* ... */
});
export const updateEnvironmentDomains = onCall(async (request) => {
  /* ... */
});

// ClientIds (per environment)
export const generateClientId = onCall(async (request) => {
  /* ... */
});
export const revokeClientId = onCall(async (request) => {
  /* ... */
});
export const listClientIds = onCall(async (request) => {
  /* ... */
});

// Configs (per environment)
export const publishConfig = onCall(async (request) => {
  /* ... */
});
export const updateConfig = onCall(async (request) => {
  /* ... */
});
export const listConfigs = onCall(async (request) => {
  /* ... */
});
```

## 9. Security Model

### 9.1 Threat Model & Mitigations

```
┌──────────────────────────────────────────────────────────────────┐
│                    Security Layers                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: ClientId Validation                                    │
│  ├── ClientId must exist in Firestore                            │
│  ├── ClientId status must be "active"                            │
│  └── Scope: can only read own project+environment configs        │
│                                                                  │
│  Layer 2: Origin/Domain Enforcement                              │
│  ├── Firebase Authorized Domains (project-level CORS)            │
│  ├── Per-environment allowedDomains list                         │
│  ├── Cloud Function checks Origin header against allowlist       │
│  └── Browser CORS prevents cross-origin JS from reading response │
│                                                                  │
│  Layer 3: Rate Limiting                                          │
│  ├── Per-clientId: 100 requests/minute (configurable)            │
│  ├── Sliding window counter (stored in Firestore or memory)      │
│  └── Returns 429 when exceeded                                   │
│                                                                  │
│  Layer 4: Scope Restriction                                      │
│  ├── ClientId → bound to exactly 1 project + 1 environment      │
│  ├── Cannot query configs outside bound scope                    │
│  └── No write access via SDK (read-only)                         │
│                                                                  │
│  Layer 5: Revocation                                             │
│  ├── Portal can revoke clientId immediately                      │
│  ├── Revoked clientIds rejected within 60 seconds                │
│  └── SDK emits "revoked" event on detection                      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 9.2 Why ClientId is Intentionally Public

The clientId follows the same security model as Firebase API keys:

1. **Visible in source:** ClientId is embedded in client-side JavaScript bundles. This is by design.
2. **Not a secret:** Knowing a clientId alone is insufficient to read config data.
3. **Domain binding:** The Cloud Function validates the request origin against the environment's allowed domains. Browser CORS enforcement prevents JavaScript on unauthorized domains from reading responses.
4. **Scope isolation:** Even if an attacker obtains a clientId, they can only read the configs for that specific project+environment — not other projects or environments.
5. **Rate limiting:** Abuse is throttled at 100 req/min per clientId.
6. **Revocation:** Compromised clientIds can be instantly revoked via the Portal.

**Limitation:** This model is browser-only. Server-side or curl requests can bypass origin checks. This is acceptable because:

- Config data is not sensitive secrets (feature flags, UI settings, timeouts)
- Server-side use cases would need a different auth model (service account)
- The attack surface is limited to reading non-secret configuration

### 9.3 Firestore Security Rules (New)

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Projects — accessible by owner and authorized users
    match /projects/{projectId} {
      allow read: if request.auth != null
        && (resource.data.ownerId == request.auth.uid
            || request.auth.uid in resource.data.authorizedUsers);
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null
        && resource.data.ownerId == request.auth.uid;

      // Environments within a project
      match /environments/{environmentId} {
        allow read: if request.auth != null
          && isProjectMember(projectId);
        allow create, update, delete: if request.auth != null
          && isProjectOwner(projectId);

        // ClientIds — only project owners can manage
        match /clientIds/{clientIdToken} {
          allow read: if request.auth != null
            && isProjectMember(projectId);
          allow create, update, delete: if request.auth != null
            && isProjectOwner(projectId);
        }

        // Published configs — project members can read, owners can write
        match /configs/{configKey} {
          allow read: if request.auth != null
            && isProjectMember(projectId);
          allow create, update: if request.auth != null
            && isProjectMember(projectId);
          allow delete: if request.auth != null
            && isProjectOwner(projectId);
        }
      }
    }

    // Helper functions
    function isProjectOwner(projectId) {
      return get(/databases/$(database)/documents/projects/$(projectId))
        .data.ownerId == request.auth.uid;
    }

    function isProjectMember(projectId) {
      let project = get(/databases/$(database)/documents/projects/$(projectId));
      return project.data.ownerId == request.auth.uid
        || request.auth.uid in project.data.authorizedUsers;
    }
  }
}
```

**Note:** SDK reads do NOT go through Firestore rules directly. The SDK calls the `getConfig` Cloud Function (HTTP endpoint), which uses the Admin SDK to read Firestore. Firestore rules only apply to Portal users accessing data via the Firebase client SDK.

## 10. Cache Layer Design

### 10.1 Updated CacheStorage with TTL

```typescript
// Internal storage format (what gets persisted)
interface CacheEntry<T> {
  value: T;
  expiresAt: number; // Unix timestamp (ms)
  version?: string; // Config version for invalidation
}

// memoryStorage implementation with TTL
export function memoryStorage(): CacheStorage {
  const store = new Map<string, CacheEntry<unknown>>();

  return {
    get<T>(key: string): T | undefined {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (Date.now() > entry.expiresAt) {
        store.delete(key); // Lazy expiration
        return undefined;
      }
      return entry.value as T;
    },

    set<T>(key: string, value: T, ttl: number = DEFAULT_CACHE_TTL): void {
      store.set(key, {
        value,
        expiresAt: Date.now() + ttl,
      });
    },

    delete(key: string): void {
      store.delete(key);
    },

    clear(): void {
      store.clear();
    },
  };
}

// browserStorage implementation with TTL
export function browserStorage(options?: BrowserStorageOptions): CacheStorage {
  const prefix = options?.prefix ?? "@jewel998/config";
  const defaultTtl = options?.defaultTtl ?? DEFAULT_CACHE_TTL;

  if (typeof window === "undefined" || !window.localStorage) {
    return memoryStorage();
  }

  return {
    get<T>(key: string): T | undefined {
      const raw = localStorage.getItem(`${prefix}:${key}`);
      if (!raw) return undefined;

      const entry: CacheEntry<T> = JSON.parse(raw);
      if (Date.now() > entry.expiresAt) {
        localStorage.removeItem(`${prefix}:${key}`);
        return undefined;
      }
      return entry.value;
    },

    set<T>(key: string, value: T, ttl: number = defaultTtl): void {
      const entry: CacheEntry<T> = {
        value,
        expiresAt: Date.now() + ttl,
      };
      localStorage.setItem(`${prefix}:${key}`, JSON.stringify(entry));
    },

    delete(key: string): void {
      localStorage.removeItem(`${prefix}:${key}`);
    },

    clear(): void {
      // Only clear keys with our prefix
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(`${prefix}:`)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    },
  };
}
```

### 10.2 Cache Key Strategy

```
Cache key format:
  Individual key:  "{configKey}"
  Batch envelope:  "__all__"
  Metadata:        "__meta__:{clientId}"

Example localStorage contents:
  @jewel998/config:feature_newUI     → { value: true, expiresAt: 1737820800000 }
  @jewel998/config:api_timeout       → { value: 5000, expiresAt: 1737820800000 }
  @jewel998/config:__all__           → { value: {...all configs...}, expiresAt: ... }
  @jewel998/config:__meta__:cid_xxx  → { value: { lastFetch: "...", version: "3" }, ... }
```

## 11. Event System Design

### 11.1 TypedEventEmitter Implementation

```typescript
type EventMap = ConfigEventPayloads;
type EventKey = keyof EventMap;

class TypedEventEmitter {
  private listeners = new Map<EventKey, Set<Function>>();

  on<E extends EventKey>(
    event: E,
    callback: (payload: EventMap[E]) => void,
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off<E extends EventKey>(
    event: E,
    callback: (payload: EventMap[E]) => void,
  ): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit<E extends EventKey>(event: E, payload: EventMap[E]): void {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;
    for (const cb of callbacks) {
      try {
        cb(payload);
      } catch (err) {
        console.error(`[Alpha] Event handler error for "${event}":`, err);
      }
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
```

### 11.2 Event Lifecycle

```
Timeline: Optimistic Strategy
─────────────────────────────────────────────────────────────────────
createConfig()
  │
  ├── emit("ready", { loadingStrategy: "optimistic", cachedKeys: 5 })
  │
  │   ... background fetch in progress ...
  │
  ├── [success] emit("updated", { keys: ["k1","k2",...], source: "background" })
  │   OR
  ├── [failure] emit("fetchError", { error, retryCount: 3, willRetry: false })
  │
  │   ... later, if clientId revoked ...
  │
  └── emit("revoked", { clientId: "cid_xxx", message: "ClientId has been revoked" })


Timeline: Pessimistic Strategy
─────────────────────────────────────────────────────────────────────
await createConfig()
  │
  ├── [resolves] emit("ready", { loadingStrategy: "pessimistic", cachedKeys: 12 })
  │   OR
  ├── [rejects]  throws InitializationError / TimeoutError (no event emitted)
  │
  │   ... on manual refresh ...
  │
  └── config.refresh()
        ├── emit("updated", { keys: [...], source: "refresh" })
        └── [or] emit("fetchError", { ... })


Timeline: Deferred Strategy
─────────────────────────────────────────────────────────────────────
createConfig()
  │
  ├── emit("ready", { loadingStrategy: "deferred", cachedKeys: 0 })
  │
  │   ... first getValue() call ...
  │
  ├── [fetch triggered]
  │     ├── emit("updated", { keys: [...], source: "background" })
  │     └── [or] emit("fetchError", { ... })
```

### 11.3 Usage Example

```typescript
const config = createConfig({ clientId: "cid_xK9m2pLqR7" });

config.on("ready", ({ cachedKeys }) => {
  console.log(`Config ready with ${cachedKeys} cached values`);
});

config.on("updated", ({ keys, source }) => {
  console.log(`${keys.length} keys updated from ${source}`);
  // Re-render UI or notify state management
});

config.on("fetchError", ({ error, willRetry }) => {
  if (!willRetry) {
    reportToErrorTracking(error);
  }
});

config.on("revoked", ({ message }) => {
  showUserNotification("Configuration access revoked. Please contact admin.");
});
```

## 12. Retry Engine

### 12.1 Exponential Backoff Implementation

```typescript
interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  multiplier: number;
  maxDelay: number;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
  onRetry?: (attempt: number, error: Error, nextDelay: number) => void,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on auth errors (4xx)
      if (isNonRetryableError(error)) {
        throw error;
      }

      if (attempt < options.maxRetries) {
        const delay = Math.min(
          options.baseDelay * Math.pow(options.multiplier, attempt),
          options.maxDelay,
        );
        // Add jitter (±25%) to prevent thundering herd
        const jitter = delay * (0.75 + Math.random() * 0.5);

        onRetry?.(attempt + 1, lastError, jitter);
        await sleep(jitter);
      }
    }
  }

  throw lastError;
}

function isNonRetryableError(error: unknown): boolean {
  if (error instanceof AuthenticationError) return true; // 401
  if (error instanceof ConfigError && error.code === "REVOKED") return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### 12.2 Default Retry Timeline

```
Attempt 0: Immediate request
  [fails]
Attempt 1: Wait ~1000ms (1s × 2^0 ± jitter)
  [fails]
Attempt 2: Wait ~2000ms (1s × 2^1 ± jitter)
  [fails]
Attempt 3: Wait ~4000ms (1s × 2^2 ± jitter)
  [fails]
→ Throw last error (all retries exhausted)

Total max wait: ~7 seconds + request times
```

## 13. HTTP Transport

### 13.1 Transport Implementation

```typescript
const CLOUD_FUNCTION_BASE_URL =
  "https://us-central1-<project>.cloudfunctions.net";

interface TransportConfig {
  baseUrl: string;
  clientId: string;
}

function createHttpTransport(config: TransportConfig) {
  return {
    async request<T>(
      endpoint: string,
      body?: Record<string, unknown>,
    ): Promise<T> {
      const url = `${config.baseUrl}/${endpoint}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            clientId: config.clientId,
            ...body,
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const code = errorBody?.error?.code ?? "NETWORK_ERROR";
        const message = errorBody?.error?.message ?? `HTTP ${response.status}`;

        if (response.status === 401) {
          throw new AuthenticationError(message);
        }
        if (response.status === 429) {
          throw new ConfigError(message, "RATE_LIMITED");
        }

        throw new ConfigError(message, code as ConfigErrorCode);
      }

      const json = await response.json();
      return json as T;
    },
  };
}
```

## 14. Projected Fetch — Microtask Batching

When using projected granularity, multiple `getValue()` calls in the same synchronous execution context are batched into a single network request.

```typescript
class ProjectedFetcher implements ConfigFetcher {
  private pendingKeys = new Set<string>();
  private batchPromise: Promise<Record<string, unknown>> | null = null;
  private batchResolvers: Array<{
    keys: string[];
    resolve: (data: Record<string, unknown>) => void;
    reject: (err: Error) => void;
  }> = [];

  constructor(
    private transport: HttpTransport,
    private clientId: string,
  ) {}

  async fetchAll(): Promise<Record<string, unknown>> {
    return this.transport.request("getConfig", {});
  }

  async fetchKeys(keys: string[]): Promise<Record<string, unknown>> {
    // Add keys to pending batch
    for (const key of keys) {
      this.pendingKeys.add(key);
    }

    // Schedule batch flush on next microtask
    if (!this.batchPromise) {
      this.batchPromise = new Promise((resolve, reject) => {
        // Use queueMicrotask for same-tick batching
        queueMicrotask(async () => {
          const batchedKeys = Array.from(this.pendingKeys);
          this.pendingKeys.clear();
          this.batchPromise = null;

          try {
            const result = await this.transport.request<GetConfigResponse>(
              "getConfig",
              { keys: batchedKeys },
            );
            resolve(result.data);
          } catch (err) {
            reject(err);
          }
        });
      });
    }

    // All callers in the same tick share the same promise
    const result = await this.batchPromise;

    // Return only the keys this caller requested
    const filtered: Record<string, unknown> = {};
    for (const key of keys) {
      if (key in result) {
        filtered[key] = result[key];
      }
    }
    return filtered;
  }
}
```

**Example:**

```typescript
// These three calls happen in the same synchronous frame
const a = config.getValue("feature_a"); // Queues "feature_a"
const b = config.getValue("feature_b"); // Queues "feature_b"
const c = config.getValue("api_timeout"); // Queues "api_timeout"

// → One network request: GET /config?keys=feature_a,feature_b,api_timeout
```

## 15. Rate Limiting (Server-Side)

### 15.1 Approach

Rate limiting is implemented in the `getConfig` Cloud Function using a sliding window counter stored in Firestore.

```typescript
// Collection: /rateLimits/{clientId}
interface RateLimitDocument {
  clientId: string;
  windowStart: number; // Unix timestamp (seconds)
  count: number;
}

const RATE_LIMIT_WINDOW = 60; // seconds
const RATE_LIMIT_MAX = 100; // requests per window

async function isRateLimited(clientId: string): Promise<boolean> {
  const db = getFirestore();
  const ref = db.collection("rateLimits").doc(clientId);
  const now = Math.floor(Date.now() / 1000);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const data = doc.data() as RateLimitDocument | undefined;

    if (!data || now - data.windowStart >= RATE_LIMIT_WINDOW) {
      // New window
      tx.set(ref, { clientId, windowStart: now, count: 1 });
      return false;
    }

    if (data.count >= RATE_LIMIT_MAX) {
      return true; // Rate limited
    }

    tx.update(ref, { count: data.count + 1 });
    return false;
  });
}
```

### 15.2 Client-Side Handling

When the SDK receives a 429 response, it:

1. Does NOT retry immediately (respects rate limit)
2. Emits a `fetchError` event with the rate limit information
3. Waits until the next window before retrying

## 16. ClientId Generation

### 16.1 Token Format

```typescript
function generateClientId(): string {
  // Format: "cid_" + 20 random alphanumeric characters
  // Provides ~119 bits of entropy (sufficient for unguessability)
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomBytes = crypto.getRandomValues(new Uint8Array(20));
  const token = Array.from(randomBytes)
    .map((b) => chars[b % chars.length])
    .join("");
  return `cid_${token}`;
}

// Example output: "cid_xK9m2pLqR7aB3cD4eF5g"
```

### 16.2 Generation Flow (Portal → Cloud Function)

```
Portal User clicks "Generate ClientId"
  │
  ▼
Portal calls Cloud Function: generateClientId({ projectId, environmentId })
  │
  ├── Verify user is project owner/member
  ├── Generate random token
  ├── Write to /projects/{pid}/environments/{eid}/clientIds/{token}
  └── Return { token, createdAt }
```

## 17. Migration Path from Current API

### 17.1 Breaking Changes Summary

| Current API                                | New API                                     | Notes                                                               |
| ------------------------------------------ | ------------------------------------------- | ------------------------------------------------------------------- |
| `createConfigClient(options)`              | `createConfig(options)`                     | New function name, new options shape                                |
| `definitions: ConfigDefinition[]`          | Removed                                     | No client-side definitions needed                                   |
| `storage: CacheStorage` (no TTL)           | `storage: CacheStorage` (with TTL)          | Interface changed: `set()` now accepts `ttl` param, added `clear()` |
| `remoteProvider: RemoteConfigProvider`     | Removed                                     | Replaced by internal HTTP transport                                 |
| `ConfigResolveContext`                     | Removed                                     | Scoping is handled by clientId                                      |
| `ConfigScope` (tenant/project/env)         | Removed                                     | Single scope per clientId                                           |
| `ConfigSourceMode` (offline/remote/hybrid) | `loadingStrategy`                           | Different enum values                                               |
| `TenantRecord`                             | Removed                                     | Tenants eliminated                                                  |
| `createConfigManager()`                    | Still exists (Portal only)                  | Updated to remove tenant methods                                    |
| `getValue(key, context)`                   | `getValue(key)` or `getValue(key, default)` | No context param needed                                             |

### 17.2 Migration Guide

```typescript
// ══════════════════════════════════════════════════
// BEFORE (current API)
// ══════════════════════════════════════════════════
import {
  createConfigClient,
  memoryStorage,
  createFirebaseRemoteConfigProvider,
} from "@jewel998/config";

const definitions = [
  {
    key: "feature_newUI",
    defaultValue: false,
    sourceMode: "remote",
    scope: "environment",
  },
  {
    key: "api_timeout",
    defaultValue: 3000,
    sourceMode: "hybrid",
    scope: "project",
  },
];

const client = createConfigClient({
  definitions,
  storage: memoryStorage(),
  remoteProvider: createFirebaseRemoteConfigProvider({ fetcher: myFetcher }),
});

const value = await client.getValue("feature_newUI", {
  tenantId: "t1",
  projectId: "p1",
  environment: "staging",
});

// ══════════════════════════════════════════════════
// AFTER (new API)
// ══════════════════════════════════════════════════
import { createConfig, browserStorage } from "@jewel998/config";

// Optimistic (default) — synchronous, instant
const config = createConfig({
  clientId: "cid_xK9m2pLqR7aB3cD4eF5g", // Encodes project+environment scope
  storage: browserStorage(), // Persistent with 7-day TTL
});

// No context needed — clientId already scopes to project+environment
const value = config.getValue("feature_newUI"); // boolean | undefined
const flag = config.getFlag("feature_newUI"); // boolean (false if missing)
const timeout = config.getValue("api_timeout", 3000); // with default

// React to updates
config.on("updated", ({ keys }) => {
  console.log("Configs updated:", keys);
});
```

### 17.3 Deprecation Timeline

1. **Phase 1 (v0.2.0):** Ship new `createConfig()` alongside existing `createConfigClient()`. Mark old API as `@deprecated`.
2. **Phase 2 (v0.3.0):** Remove tenant-related types and functions. Old API still works but logs warnings.
3. **Phase 3 (v1.0.0):** Remove `createConfigClient()` entirely. Only new API available.

### 17.4 Package Exports (Updated)

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./storage": {
      "types": "./dist/cache/types.d.ts",
      "import": "./dist/cache/index.js"
    },
    "./management": {
      "types": "./dist/management/index.d.ts",
      "import": "./dist/management/index.js"
    }
  }
}
```

Note: `./remote` and `./remote/firebase` exports are removed. The SDK no longer exposes a generic remote provider interface — it uses an internal HTTP transport to the Cloud Function.

## 18. Usage Examples

### 18.1 Basic Usage (Optimistic, Default Settings)

```typescript
import { createConfig, browserStorage } from "@jewel998/config";

const config = createConfig({
  clientId: "cid_xK9m2pLqR7aB3cD4eF5g",
  storage: browserStorage(),
});

// Immediately available (from cache or undefined)
const showBanner = config.getFlag("promo_banner");
const apiUrl = config.getValue<string>(
  "api_base_url",
  "https://api.default.com",
);
```

### 18.2 Pessimistic — Await Before Rendering

```typescript
import { createConfig, browserStorage } from "@jewel998/config";

async function initApp() {
  try {
    const config = await createConfig({
      clientId: "cid_xK9m2pLqR7aB3cD4eF5g",
      loadingStrategy: "pessimistic",
      storage: browserStorage(),
      timeout: 5000, // Fail fast
    });

    renderApp(config);
  } catch (error) {
    if (error instanceof TimeoutError) {
      renderFallbackUI();
    } else {
      renderErrorPage(error);
    }
  }
}
```

### 18.3 Deferred + Projected — Minimal Payload

```typescript
import { createConfig, memoryStorage } from "@jewel998/config";

const config = createConfig({
  clientId: "cid_xK9m2pLqR7aB3cD4eF5g",
  loadingStrategy: "deferred",
  fetchGranularity: "projected",
  storage: memoryStorage(),
});

// No network calls made yet

// Later, in a component:
function FeaturePanel() {
  const enabled = config.getFlag("feature_panel_v2");
  // ↑ This triggers a fetch for just "feature_panel_v2"
  // (or micro-batched with other same-tick getValue calls)
}
```

### 18.4 Custom Retry + Event Handling

```typescript
const config = createConfig({
  clientId: "cid_xK9m2pLqR7aB3cD4eF5g",
  retry: {
    maxRetries: 5,
    baseDelay: 500,
    multiplier: 1.5,
    maxDelay: 10000,
  },
  storage: browserStorage({ prefix: "myapp-config" }),
});

config.on("fetchError", ({ error, retryCount, willRetry }) => {
  analytics.track("config_fetch_error", {
    message: error.message,
    retries: retryCount,
    willRetry,
  });
});

config.on("revoked", () => {
  // Force user to refresh or show maintenance page
  window.location.reload();
});
```

## 19. Non-Functional Considerations

### 19.1 Bundle Size Budget

| Module                                | Estimated Size (gzipped) |
| ------------------------------------- | ------------------------ |
| createConfig + client                 | ~3KB                     |
| Loading strategies                    | ~2KB                     |
| Cache layer (memory + browser)        | ~1.5KB                   |
| Event emitter                         | ~0.5KB                   |
| Retry engine                          | ~0.5KB                   |
| HTTP transport                        | ~1KB                     |
| Error types                           | ~0.5KB                   |
| Projected fetcher (microtask batcher) | ~1KB                     |
| **Total**                             | **~10KB**                |

Target: Under 15KB gzipped (excluding Firebase dependency, which is not required by the SDK itself).

### 19.2 Performance Targets

- `createConfig()` with optimistic/deferred: < 5ms (sync path, no I/O)
- `getValue()` cache hit: < 1ms
- `getFlag()` cache hit: < 1ms
- `getAll()` cache hit: < 2ms
- Background fetch (network-dependent): aim for < 200ms P95

### 19.3 Browser Compatibility

- Modern browsers: Chrome 80+, Firefox 78+, Safari 14+, Edge 80+
- Required APIs: `fetch`, `queueMicrotask`, `crypto.getRandomValues`, `localStorage`
- No polyfills bundled — consumers handle their own if targeting older browsers

## 20. Open Questions / Future Considerations

1. **Real-time updates via WebSocket/SSE:** Currently configs are polled. Future version could subscribe to Firestore changes via Cloud Function streaming for instant push updates.

2. **Server-side SDK variant:** This design is browser-only. A Node.js SDK would need service-account auth instead of clientId+domain enforcement.

3. **Config versioning / rollback:** The current design stores a `version` field per config. Future: support rolling back to a previous version set.

4. **Multi-environment SDK instances:** Should one app be able to hold multiple `createConfig()` instances for different environments? Currently supported but not explicitly designed for.

5. **Offline-first with service worker:** Could cache responses in a service worker for true offline resilience beyond localStorage TTL.
