# SDK API Reference

> See also: [Loading Strategies](/guide/loading-strategies) · [Storage & Caching](/guide/storage) · [Cloud Functions](/api/cloud-functions)

The `@jewel998/config` SDK provides a simple interface for fetching and evaluating feature flags and remote configuration.

## initConfig (Recommended)

The primary entry point. Returns a `Flags` instance with three-tier priority fetching.

```ts
import { initConfig, autoContext } from "@jewel998/config";

const flags = initConfig({
  clientId: "cid_xxx",
  baseUrl: "https://your-project.web.app/api",
  prefetch: ["app.maintenance_mode"], // Tier 1 — blocks ready()
  defaults: { "feature.dark_mode": false },
  context: autoContext({ userId: "user_123", plan: "pro" }),
  onError: (err) => console.error(err.type, err.key),
});

await flags.ready(); // wait for Tier 1
const darkMode = await flags.get<boolean>("feature.dark_mode"); // → false
```

## InitConfigOptions

| Property       | Type                      | Default                               | Description                                                                 |
| -------------- | ------------------------- | ------------------------------------- | --------------------------------------------------------------------------- |
| `clientId`     | `string`                  | (required)                            | API key from your Portal (cid_ or svr_)                                     |
| `prefetch`     | `string[]`                | `[]`                                  | Tier 1 keys — fetched immediately, block `ready()` resolution               |
| `baseUrl`      | `string`                  | `https://jewel998-config.web.app/api` | Your self-hosted Firebase API URL                                           |
| `defaults`     | `Record<string, unknown>` | `{}`                                  | Fallback values — `get()` resolves instantly when a default exists          |
| `context`      | `EvaluationContext`       | `{}`                                  | User context for targeting. Use `autoContext()`                             |
| `timeout`      | `number`                  | `30000` (30s)                         | `get()` timeout for keys with no default. Calls `onError`, rejects Promise. |
| `pollInterval` | `number`                  | `300000` (5 min)                      | Version polling interval in ms. Set to `0` to disable.                      |
| `storage`      | `CacheStorage`            | `memoryStorage()`                     | Cache adapter. Use `browserStorage()` to persist across reloads.            |
| `onError`      | `(err: SdkError) => void` | `undefined`                           | Global error handler — called on every error across all tiers               |

## Flags Interface

| Method       | Signature                                | Description                                                                       |
| ------------ | ---------------------------------------- | --------------------------------------------------------------------------------- |
| `ready`      | `() => Promise<void>`                    | Resolves when Tier 1 (init prefetch) keys are ready. Instant if none declared.    |
| `prefetch`   | `(keys: string[]) => void`               | Tier 2 fetch hint — fire-and-forget. Already-fetched keys are skipped.            |
| `get`        | `<T>(key, defaultValue?) => Promise<T>`  | Get a typed value. Instant from cache/default. Suspends if unfetched, no default. |
| `all`        | `() => Promise<Record<string, unknown>>` | Snapshot of all fetched values merged with defaults. No waiting.                  |
| `setContext` | `(ctx: EvaluationContext) => void`       | Fire-and-forget context update. Re-fetches fetched keys debounced 100ms.          |
| `refresh`    | `() => Promise<void>`                    | Re-fetch all already-fetched keys in tier order.                                  |
| `on`         | `(event: string, cb) => void`            | Subscribe to events (see Events table below)                                      |
| `off`        | `(event: string, cb) => void`            | Unsubscribe from events                                                           |

::: info flag() removed
The `flag()` method has been removed. Use `get<boolean>("key")` instead.
:::

::: info get() is now async
`get()` returns a `Promise<T>`. If the key is in memory, cache, or has a default, it resolves on the next microtask (effectively instant). If the key hasn't been fetched yet and no default is provided, it suspends until the idle fetch or `refresh()` delivers it, or rejects after the global timeout.
:::

## createConfig (Advanced)

Lower-level entry point with full control over loading strategy, plugins, and caching.

::: tip When to use createConfig vs initConfig
Use `initConfig` for most frontend apps — it handles polling, versioning, and defaults automatically. Use `createConfig` when you need custom loading strategies, client-side evaluation with plugins, or consent-aware GDPR mode.
:::

```ts
import { createConfig } from "@jewel998/config";

const config = createConfig({
  clientId: "cid_xxx",
  baseUrl: "https://your-project.web.app/api",
  context: { userId: "user_123", attributes: { plan: "pro" } },
});
```

## CreateConfigOptions

| Property           | Type                                          | Default           | Description                                                                                          |
| ------------------ | --------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------- |
| `clientId`         | `string`                                      | (required)        | API key from Portal → API Keys. Prefix determines evaluation mode: `cid_` = server, `svr_` = client. |
| `loadingStrategy`  | `"optimistic" \| "pessimistic" \| "deferred"` | `"optimistic"`    | How data is loaded on init                                                                           |
| `fetchGranularity` | `"batch" \| "projected"`                      | `"batch"`         | Fetch all keys or only requested ones                                                                |
| `storage`          | `CacheStorage`                                | `memoryStorage()` | Cache adapter (memory or browser localStorage)                                                       |
| `plugins`          | `EvaluationPlugin[]`                          | `[]`              | Plugins for client-mode local evaluation (svr_ keys only)                                            |
| `context`          | `EvaluationContext`                           | `{}`              | User context for targeting                                                                           |
| `retry`            | `RetryConfig`                                 | 3 retries         | Retry configuration for failed fetches                                                               |
| `timeout`          | `number`                                      | `10000`           | Pessimistic mode timeout (ms)                                                                        |
| `baseUrl`          | `string`                                      | Demo instance URL | Custom API endpoint                                                                                  |
| `consentAware`     | `boolean`                                     | `false`           | GDPR mode: returns defaults until consent is granted                                                 |

::: info Evaluation mode is auto-detected
The evaluation mode is determined by the `clientId` prefix — not a configuration option. `cid_` keys use server-side evaluation (API resolves values). `svr_` keys use client-side evaluation (SDK evaluates locally with plugins).
:::

## ConfigClient

| Method       | Signature                            | Description                                            |
| ------------ | ------------------------------------ | ------------------------------------------------------ |
| `getValue`   | `<T>(key: string, default?: T) => T` | Get a typed config value                               |
| `getFlag`    | `(key: string) => boolean`           | Get a boolean flag (false if missing)                  |
| `getAll`     | `() => Record<string, unknown>`      | Get all config key-value pairs                         |
| `refresh`    | `() => Promise<void>`                | Version-gated re-fetch (skips if unchanged)            |
| `setContext` | `(ctx: EvaluationContext) => void`   | Update user context (triggers re-fetch in server mode) |
| `on`         | `(event, callback) => void`          | Subscribe to lifecycle events                          |
| `off`        | `(event, callback) => void`          | Unsubscribe from events                                |
| `destroy`    | `() => void`                         | Clean up timers, listeners, and circuit breaker state  |

## EvaluationContext

```ts
interface EvaluationContext {
  userId?: string;
  attributes?: Record<string, string | number | boolean | string[]>;
  consentGranted?: boolean;
}
```

## Evaluation Modes

### Server Mode (default)

The SDK sends user context to the API. The API evaluates targeting rules, segment membership, rollouts, schedules, and prerequisites — then returns only the final resolved values.

- No business logic exposed to the browser
- Smaller response payload (~200 bytes vs 5-50KB)
- `setContext()` triggers a re-fetch for fresh evaluation
- No plugins needed

```ts
const config = createConfig({
  clientId: "cid_xxx",
  context: mergeContext(autoContext(), {
    userId: "user_123",
    attributes: { plan: "enterprise" },
  }),
});

// Values are already resolved by the API
config.getFlag("feature.new_checkout"); // → true
```

### Client Mode (opt-in)

The API returns full flag data (targeting rules, segments, rollout percentages). The SDK evaluates everything locally using the plugin pipeline. Best for advanced frontend scenarios that need instant re-evaluation without network round-trips.

::: warning Browser-only SDK
The `@jewel998/config` SDK is browser-only — it throws an error if `window` is undefined. For Node.js/server-side usage, call the `/api/v1/config` endpoint directly with a `svr_` key and evaluate locally using your own logic, or use the server evaluator from the functions package.
:::

```ts
const config = createConfig({
  clientId: "svr_xxx", // svr_ prefix auto-enables client-side evaluation
  plugins: [targetingPlugin(segments), rolloutPlugin()],
  context: { userId: "user_123", attributes: { plan: "pro" } },
});
```

## Auto-Context Helpers

### autoContext()

Automatically detects common browser/device attributes:

```ts
import { autoContext } from "@jewel998/config";

const ctx = autoContext();
// → { attributes: { browser: "Chrome", os: "macOS", device: "desktop", locale: "en-US", ... } }
```

| Attribute        | Type   | Example             |
| ---------------- | ------ | ------------------- |
| `browser`        | string | "Chrome", "Firefox" |
| `browserVersion` | string | "126.0"             |
| `os`             | string | "macOS", "Windows"  |
| `device`         | string | "desktop", "mobile" |
| `screenWidth`    | number | 1920                |
| `screenHeight`   | number | 1080                |
| `locale`         | string | "en-US"             |
| `timezone`       | string | "America/New_York"  |

### mergeContext()

Deep-merge auto-detected and user-provided contexts. User values take precedence.

```ts
import { autoContext, mergeContext } from "@jewel998/config";

const context = mergeContext(autoContext(), {
  userId: "user_123",
  attributes: { plan: "enterprise", country: "US" },
});
```

## Events

| Event              | Payload                              | Description                                      |
| ------------------ | ------------------------------------ | ------------------------------------------------ |
| `updated`          | `{ keys: string[], source: string }` | Any keys updated (batch, one event per fetch)    |
| `updated:key.name` | `value: unknown`                     | Specific key updated — fires with new value      |
| `fetchError`       | `{ error, retryCount, willRetry }`   | A fetch failed                                   |
| `ready`            | `{ loadingStrategy, cachedKeys }`    | SDK initialized (emitted by `createConfig` only) |
| `revoked`          | `{ clientId, message }`              | API key revoked                                  |

### Key-Specific Events

Subscribe to a single key changing without filtering the batch `updated` event:

```ts
flags.on("updated:feature.dark_mode", (value) => {
  applyTheme(value as boolean);
});

flags.off("updated:feature.dark_mode", handler);
```

### SdkError (onError / get() rejection)

```ts
interface SdkError {
  type: "TIMEOUT" | "FETCH_FAILED" | "KEY_NOT_FOUND" | "AUTH" | "RATE_LIMITED";
  key?: string; // which key triggered the error
  cause?: Error; // underlying Error object
}
```

| Type            | When                                                      |
| --------------- | --------------------------------------------------------- |
| `TIMEOUT`       | `get()` waited longer than global timeout with no default |
| `FETCH_FAILED`  | Network error or non-2xx response                         |
| `KEY_NOT_FOUND` | Key does not exist in the project                         |
| `AUTH`          | 401/403 — circuit breaker opens                           |
| `RATE_LIMITED`  | 429 from the API                                          |

### Version-Gated Refresh

When `refresh()` is called, the SDK first calls `/api/v1/version` (tiny response: version number + changed keys). If the version matches the cached one, the full `/api/v1/config` call is skipped entirely. This means most refresh cycles cost almost nothing.

```ts
// This only hits /api/v1/config if the version has actually changed
await config.refresh();
```

### Circuit Breaker

The SDK includes a circuit breaker that stops making requests after receiving fatal errors (400, 401, 403). This prevents wasting bandwidth on misconfigured clients.

| State     | Behavior                                     |
| --------- | -------------------------------------------- |
| CLOSED    | Normal operation — all requests flow through |
| OPEN      | Fatal error received — blocks for 5 minutes  |
| HALF_OPEN | Cooldown expired — allows one probe request  |

If the probe succeeds, the circuit closes. If it fails again, it stays open for another 5 minutes.

```ts
// If you need to reset the circuit (e.g., after fixing the clientId):
config.destroy();
const newConfig = createConfig({ clientId: "cid_fixed_key", ... });
```

## Error Codes

The SDK maps HTTP status codes to typed error codes:

| HTTP Status | Error Code              | Retries? | Circuit? |
| ----------- | ----------------------- | -------- | -------- |
| 400         | `BAD_REQUEST`           | ❌       | Opens    |
| 401         | `AUTHENTICATION_FAILED` | ❌       | Opens    |
| 403         | `FORBIDDEN`             | ❌       | Opens    |
| 404         | `NOT_FOUND`             | ❌       | —        |
| 405         | `METHOD_NOT_ALLOWED`    | ❌       | —        |
| 413         | `PAYLOAD_TOO_LARGE`     | ❌       | —        |
| 429         | `RATE_LIMITED`          | ✅       | —        |
| 500-504     | `SERVER_ERROR`          | ✅       | —        |
| Other       | `NETWORK_ERROR`         | ✅       | —        |

## Error Handling

The SDK never throws errors to consumers. All errors are emitted via the `fetchError` event:

```ts
config.on("fetchError", ({ error, willRetry }) => {
  console.warn("Config fetch failed:", error.message);
});
```

### Rate Limit Handling

When the server returns a 429, the SDK creates a `RateLimitError` that includes the server-specified retry delay from the `Retry-After` header. The retry engine waits exactly that long before retrying (instead of generic exponential backoff).

```ts
import { RateLimitError } from "@jewel998/config";

flags.on("fetchError", ({ error }) => {
  if (error instanceof RateLimitError) {
    console.warn(`Rate limited — server says retry in ${error.retryAfterSeconds}s`);
  }
});
```

The SDK retries rate-limited requests up to `maxRetries` times (default: 3). If all retries are exhausted, the SDK falls back to cached or default values.
