# Getting Started

> See also: [Concepts & Glossary](/guide/concepts) · [Loading Strategies](/guide/loading-strategies) · [Self-Hosting Guide](/guide/self-hosting)

Get feature flags running in your app in under 5 minutes.

## 1. Install the SDK

```bash
npm install @jewel998/config
```

## 2. Initialize

```typescript
import { initConfig, autoContext } from "@jewel998/config";

const flags = initConfig({
  clientId: "cid_xxx", // From your Portal → API Keys
  baseUrl: "https://your-project.web.app/api", // Your Firebase URL
  defaults: {
    "feature.dark_mode": false,
    "app.upload_limit": 50,
    "feature.new_checkout": false,
  },
  context: autoContext({ userId: "user_123", plan: "pro" }),
});
```

## 3. Read Flags

```typescript
// Boolean flags
const darkMode = flags.flag("feature.dark_mode"); // → true/false

// Typed values
const limit = flags.get<number>("app.upload_limit"); // → 200

// All flags
const all = flags.all(); // → { "feature.dark_mode": true, ... }
```

## 4. React to Updates

```typescript
flags.on("updated", ({ keys }) => {
  console.log("Flags changed:", keys);
  // Re-render UI, update state, etc.
});
```

## How It Works

1. **Instant**: `flags.get()` returns your `defaults` immediately — no loading state
2. **Background fetch**: SDK calls your API once on init
3. **Resolved values**: API evaluates [targeting rules](/features/targeting) server-side, returns flat values
4. **Cached**: All subsequent reads are from local cache (0ms)
5. **Version-gated refresh**: SDK polls `/api/v1/version` (tiny response). Only re-fetches full config when the version number changes.
6. **Circuit breaker**: If the API returns 401/403, the SDK stops retrying for 5 minutes to prevent hammering a misconfigured endpoint.
7. **Cleanup**: When using `createConfig`, call `client.destroy()` to clear timers and listeners. With `initConfig`, timers are tied to the page lifecycle.

## Configuration Options

```typescript
const flags = initConfig({
  clientId: "cid_xxx",           // Required — your API key
  baseUrl: "https://...",        // Your self-hosted Firebase URL (defaults to demo instance)
  defaults: { ... },            // Fallback values (instant)
  context: autoContext({ ... }), // User attributes for targeting
  pollInterval: 300_000,         // Version polling (default: 5 min, 0 to disable)
  storage: browserStorage(),     // Cache adapter (default: memoryStorage) — see [Storage & Caching](/guide/storage)
});
```

::: warning baseUrl
If you omit `baseUrl`, the SDK defaults to a demo instance (`https://jewel998-config.web.app/api`). For production, always set this to your own Firebase deployment URL.
:::

## Auto-Context

`autoContext()` detects browser/device info AND merges your custom attributes:

```typescript
// Auto-detects: browser, OS, device, screen, locale, timezone
// Your values override auto-detected ones
const context = autoContext({
  userId: "user_123",
  plan: "enterprise",
  country: "US",
});
```

## Updating User Context

When the user's plan changes, signs in, or navigates:

```typescript
flags.setContext(autoContext({ userId: "user_456", plan: "free" }));
// SDK re-fetches resolved values for the new context (debounced)
```

## API Key Types

| Prefix | Use In              | Behavior                                                     |
| ------ | ------------------- | ------------------------------------------------------------ |
| `cid_` | Frontend            | API evaluates targeting server-side, returns only values     |
| `svr_` | Frontend (advanced) | API returns full flag data for local evaluation with plugins |

::: info Server keys are NOT for Node.js
Despite the `svr_` prefix, the SDK is browser-only. Server keys return full flag data so the **browser SDK** can evaluate targeting locally (useful for reducing latency). For actual Node.js backends, call the API directly via HTTP.
:::

## Which API Should I Use?

The SDK exports two entry points: `initConfig` and `createConfig`.

| Use Case                                 | Recommended API | Why                                                   |
| ---------------------------------------- | --------------- | ----------------------------------------------------- |
| Most apps (frontend with `cid_` key)     | `initConfig`    | Simpler API, handles polling/versioning automatically |
| Need custom loading strategy             | `createConfig`  | Control over optimistic/pessimistic/deferred loading  |
| Need client-side evaluation (`svr_` key) | `createConfig`  | Pass plugins for local rollout/targeting evaluation   |
| Need consent-aware mode (GDPR)           | `createConfig`  | Supports `consentAware` option                        |

```typescript
// initConfig — simple, recommended for most use cases
const flags = initConfig({ clientId: "cid_xxx", defaults: { ... } });

// createConfig — advanced, full control (svr_ key auto-enables client evaluation)
const client = createConfig({
  clientId: "svr_xxx",
  plugins: [targetingPlugin(segments), rolloutPlugin()],
  loadingStrategy: "pessimistic", // blocks until data is fetched
});
```

See the [SDK API Reference](/api/) for full details on both.

## Next Steps

- [Self-Hosting Guide](/guide/self-hosting) — Deploy to your own Firebase
- [Segments](/features/segments) — Create reusable audience groups
- [Targeting Rules](/features/targeting) — Serve different values per user
- [SDK Reference](/api/) — Full API documentation

## Related

- [Loading Strategies](/guide/loading-strategies) — Choose between optimistic, pessimistic, and deferred initialization
- [Storage & Caching](/guide/storage) — Configure how the SDK caches resolved values
- [Configuration Scopes](/guide/scopes) — Understand how context, segments, and scopes work together
- [Environments](/features/environments) — Separate configs by deployment stage
- [Self-Hosting Guide](/guide/self-hosting) — Deploy the platform to your own Firebase project
