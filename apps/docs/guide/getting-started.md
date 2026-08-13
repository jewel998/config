# Getting Started

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
3. **Resolved values**: API evaluates targeting rules server-side, returns flat values
4. **Cached**: All subsequent reads are from local cache (0ms)
5. **Auto-refresh**: SDK polls `/api/version` every 5 min (configurable). Only re-fetches when configs actually change.

## Configuration Options

```typescript
const flags = initConfig({
  clientId: "cid_xxx",           // Required — your API key
  baseUrl: "https://...",        // Required for self-hosted
  defaults: { ... },            // Fallback values (instant)
  context: autoContext({ ... }), // User attributes for targeting
  pollInterval: 300_000,         // Version polling (default: 5 min, 0 to disable)
});
```

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

| Prefix | Use In   | Behavior                                                     |
| ------ | -------- | ------------------------------------------------------------ |
| `cid_` | Frontend | API evaluates targeting server-side, returns only values     |
| `svr_` | Backend  | API returns full flag data for local evaluation with plugins |

## Next Steps

- [Self-Hosting Guide](/guide/self-hosting) — Deploy to your own Firebase
- [Segments](/features/segments) — Create reusable audience groups
- [Targeting Rules](/features/targeting) — Serve different values per user
- [SDK Reference](/api/) — Full API documentation
