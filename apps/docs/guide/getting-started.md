# Getting Started

> See also: [Concepts & Glossary](/guide/concepts) · [SDK Fetch Flow](/guide/fetch-flow) · [Self-Hosting Guide](/guide/self-hosting)

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
  baseUrl: "https://your-project.web.app/api",
  prefetch: ["app.maintenance_mode", "feature.auth_provider"], // Tier 1 — fetched immediately
  defaults: {
    "feature.dark_mode": false,
    "app.upload_limit": 50,
    "feature.new_checkout": false,
  },
  context: autoContext({ userId: "user_123", plan: "pro" }),
  onError: (err) => console.error(`[flags] ${err.type} — ${err.key ?? "general"}`),
});

// Wait for Tier 1 (prefetch) keys before first render
await flags.ready();
```

## 3. Read Flags

`get()` is async. It resolves instantly when the value is in memory, cache, or defaults. If the key hasn't been fetched yet and no default is provided, it suspends until the idle fetch or a `refresh()` delivers it.

```typescript
// Instant — has a default in the defaults map
const darkMode = await flags.get<boolean>("feature.dark_mode"); // → false

// Typed generics — matches the type of your default
const limit = await flags.get<number>("app.upload_limit"); // → 200

// Inline default — also instant
const theme = await flags.get<string>("app.theme", "light");

// All resolved values (snapshot, no waiting)
const all = await flags.all();
```

## 4. Declare Page-Level Keys (Tier 2)

Call `prefetch()` in your route or page component to hint the SDK about keys needed for that view. Fire-and-forget — it fetches in the background and emits `"updated"` when done. Keys already in Tier 1 are skipped automatically.

```typescript
// In your route component
flags.prefetch(["feature.new_checkout", "app.upload_limit"]);
```

## 5. React to Updates

```typescript
// Batch — any keys changed
flags.on("updated", ({ keys }) => {
  console.log("Keys updated:", keys);
});

// Key-specific — fires with the new value
flags.on("updated:feature.dark_mode", (value) => {
  applyTheme(value as boolean);
});
```

## How It Works

The SDK uses a [three-tier fetch model](/guide/fetch-flow) designed for large flag sets (100s–1000s of keys):

1. **Tier 1 — Prefetch** (`prefetch` option): fetched immediately at init. `ready()` blocks until these resolve. Use for values your app cannot render without.
2. **Tier 2 — Page** (`flags.prefetch(keys)`): fetched on demand per route/component. Fire-and-forget.
3. **Tier 3 — Idle**: full `fetchAll()` runs during browser idle time via `requestIdleCallback`. Fills in everything else.

`get()` resolves from whichever tier has delivered the key first. If a key has no default and hasn't been fetched yet, `get()` suspends until Tier 3 runs or `refresh()` is called.

**Version polling**: every 5 minutes the SDK polls `/api/v1/version` (100 bytes). On version change, only already-fetched keys are re-fetched — never the full set.

**Context change**: `setContext()` re-fetches only already-fetched keys in tier order with the new context. Debounced 100ms.

## Configuration Options

```typescript
const flags = initConfig({
  clientId:     "cid_xxx",           // Required — your API key
  baseUrl:      "https://...",       // Your Firebase URL (defaults to demo instance)
  prefetch:     ["app.key"],         // Tier 1 — blocks ready()
  defaults:     { ... },             // Fallback values — get() resolves instantly
  context:      autoContext({ ... }), // User attributes for targeting
  pollInterval: 300_000,             // Version polling (default: 5 min, 0 = disabled)
  timeout:      30_000,              // get() timeout with no default (default: 30s)
  storage:      browserStorage(),    // [Cache adapter](/guide/storage) (default: memoryStorage)
  onError:      (err) => { ... },   // Global error handler
});
```

::: warning baseUrl
If you omit `baseUrl`, the SDK defaults to a demo instance. For production, always set this to your own Firebase deployment URL.
:::

## Updating User Context

When the user signs in, changes plan, or navigates:

```typescript
flags.setContext(autoContext({ userId: "user_456", plan: "enterprise" }));
// Debounced 100ms, then re-fetches already-fetched keys with new context
// Subscribe to "updated" to know when re-fetch completes
```

## Error Handling

```typescript
const flags = initConfig({
  onError: (err) => {
    // err.type: "TIMEOUT" | "FETCH_FAILED" | "KEY_NOT_FOUND" | "AUTH" | "RATE_LIMITED"
    // err.key:  which key triggered the error (if applicable)
    // err.cause: the underlying Error
    logger.error("Flag error", err);
  },
});

// get() also rejects on error (when no default is provided)
try {
  const val = await flags.get<string>("feature.experiment");
} catch (err) {
  // err is SdkError with .type, .key, .cause
}
```

## API Key Types

| Prefix | Use In           | Behavior                                                     |
| ------ | ---------------- | ------------------------------------------------------------ |
| `cid_` | Frontend         | API evaluates targeting server-side, returns only values     |
| `svr_` | Backend / Server | API returns full flag data for local evaluation with plugins |

## Next Steps

- [Self-Hosting Guide](/guide/self-hosting) — Deploy to your own Firebase
- [Segments](/features/segments) — Create reusable audience groups
- [Targeting Rules](/features/targeting) — Serve different values per user
- [SDK Reference](/api/) — Full API documentation
