# SDK API Reference

The `@jewel998/config` SDK provides a simple interface for fetching and evaluating feature flags and remote configuration.

## createConfig

The main entry point for initializing the SDK.

```ts
import { createConfig } from "@jewel998/config";

// Server mode (default) — API evaluates targeting, returns resolved values
const config = createConfig({
  clientId: "cid_xxx",
  context: { userId: "user_123", attributes: { plan: "pro" } },
});

// Client mode — full flag data returned, evaluate locally with plugins
const config = await createConfig({
  clientId: "cid_xxx",
  evaluationMode: "client",
  loadingStrategy: "pessimistic",
  plugins: [targetingPlugin(), rolloutPlugin()],
  context: { userId: "user_123", attributes: { plan: "pro" } },
});
```

## CreateConfigOptions

| Property           | Type                                          | Default           | Description                                          |
| ------------------ | --------------------------------------------- | ----------------- | ---------------------------------------------------- |
| `clientId`         | `string`                                      | (required)        | API key from Portal → API Keys                       |
| `evaluationMode`   | `"server" \| "client"`                        | `"server"`        | Where targeting/rollout evaluation happens           |
| `loadingStrategy`  | `"optimistic" \| "pessimistic" \| "deferred"` | `"optimistic"`    | How data is loaded on init                           |
| `fetchGranularity` | `"batch" \| "projected"`                      | `"batch"`         | Fetch all keys or only requested ones                |
| `storage`          | `CacheStorage`                                | `memoryStorage()` | Cache adapter (memory or browser localStorage)       |
| `plugins`          | `EvaluationPlugin[]`                          | `[]`              | Plugins for client-mode local evaluation             |
| `context`          | `EvaluationContext`                           | `{}`              | User context for targeting                           |
| `retry`            | `RetryConfig`                                 | 3 retries         | Retry configuration for failed fetches               |
| `timeout`          | `number`                                      | `10000`           | Pessimistic mode timeout (ms)                        |
| `baseUrl`          | `string`                                      | Production URL    | Custom API endpoint                                  |
| `consentAware`     | `boolean`                                     | `false`           | GDPR mode: returns defaults until consent is granted |

## ConfigClient

| Method       | Signature                            | Description                                            |
| ------------ | ------------------------------------ | ------------------------------------------------------ |
| `getValue`   | `<T>(key: string, default?: T) => T` | Get a typed config value                               |
| `getFlag`    | `(key: string) => boolean`           | Get a boolean flag (false if missing)                  |
| `getAll`     | `() => Record<string, unknown>`      | Get all config key-value pairs                         |
| `refresh`    | `() => Promise<void>`                | Force re-fetch from API                                |
| `setContext` | `(ctx: EvaluationContext) => void`   | Update user context (triggers re-fetch in server mode) |
| `on`         | `(event, callback) => void`          | Subscribe to lifecycle events                          |
| `off`        | `(event, callback) => void`          | Unsubscribe from events                                |

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

The API returns full flag data (targeting rules, segments, rollout percentages). The SDK evaluates everything locally using the plugin pipeline. Best for backend services that need instant re-evaluation without network round-trips.

```ts
const config = createConfig({
  clientId: "cid_xxx",
  evaluationMode: "client",
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

| Event        | Payload                                               | Description           |
| ------------ | ----------------------------------------------------- | --------------------- |
| `ready`      | `{ loadingStrategy, cachedKeys }`                     | SDK initialized       |
| `updated`    | `{ keys: string[], source: "background"\|"refresh" }` | Config values changed |
| `fetchError` | `{ error, retryCount, willRetry }`                    | Fetch failed          |
| `revoked`    | `{ clientId, message }`                               | API key revoked       |

## Error Handling

The SDK never throws errors to consumers. All errors are emitted via the `fetchError` event:

```ts
config.on("fetchError", ({ error, willRetry }) => {
  console.warn("Config fetch failed:", error.message);
});
```

This prevents SDK errors from appearing in your Sentry or error tracking.
