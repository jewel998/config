# Cost & Scaling

> See also: [Performance Tuning](/guide/performance) · [Storage & Caching](/guide/storage)

Understand the cost profile of your @jewel998/config deployment and optimize for scale.

## Cost at Scale

| Users    | Version polls/month | Config fetches/month | Function calls | Firestore reads/day | Cost      |
| -------- | ------------------- | -------------------- | -------------- | ------------------: | --------- |
| 100      | 864K                | ~100                 | ~1,000         |                ~200 | $0        |
| 1,000    | 8.6M                | ~1,000               | ~6,000         |              ~1,500 | $0        |
| 10,000   | 86M                 | ~10,000              | ~40,000        |             ~10,000 | $0        |
| 50,000   | 432M                | ~50,000              | ~150,000       |             ~40,000 | $0*       |
| 100,000+ | —                   | —                    | —              |                   — | ~$5-15/mo |

*CDN absorbs 99%+ of version polls (15s cache). Actual function invocations are a fraction of raw request count.

Firebase free tier limits: 2M function invocations/month, 50K Firestore reads/day, 10GB hosting bandwidth.

## Cost Optimization Guide

The SDK is designed to minimize API costs by default. Here's how each feature saves you money, and what you can tune for maximum efficiency.

### Built-in Cost Savings

| Feature                   | How It Saves Money                                                                                                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Version-gated refresh** | `refresh()` calls `/api/v1/version` first (1 Firestore read, ~100 bytes). Only fetches full config if version changed. 95%+ of refresh cycles cost almost nothing.         |
| **CDN caching**           | `/api/v1/version` cached 15s, `/api/v1/config` (client mode) cached 60s. At 10K users polling every 5 min, CDN serves 99% — only ~60 function calls/hour actually execute. |
| **Circuit breaker**       | On 401/403, SDK stops all requests for 5 minutes. Prevents runaway costs from misconfigured clients.                                                                       |
| **Request deduplication** | Multiple `refresh()` calls within the same tick share a single network request.                                                                                            |
| **30s stale check**       | `setContext()` skips re-fetch if the last fetch was <30s ago. Prevents unnecessary calls during rapid user interactions.                                                   |
| **7-day cache TTL**       | Once fetched, values persist in memory/localStorage for 7 days. Page refreshes use cached data immediately.                                                                |
| **Conditional requests**  | `/api/v1/version` supports `If-None-Match` (ETag). When version is unchanged, server returns 304 with zero body.                                                           |

### Recommended Configuration for Cost Efficiency

```typescript
import { initConfig, autoContext } from "@jewel998/config";

const flags = initConfig({
  clientId: "cid_xxx",
  baseUrl: "https://your-project.web.app/api",
  defaults: {
    // Define ALL flags here — served instantly, zero API cost
    "feature.dark_mode": false,
    "feature.new_checkout": false,
    "app.upload_limit": 50,
  },
  context: autoContext({ userId: "user_123" }),
  // Longer poll interval = fewer API calls
  pollInterval: 600_000, // 10 minutes instead of default 5
});
```

For maximum cache persistence across page reloads, add [`browserStorage`](/guide/storage):

```typescript
import { initConfig, browserStorage, autoContext } from "@jewel998/config";

const flags = initConfig({
  clientId: "cid_xxx",
  baseUrl: "https://your-project.web.app/api",
  storage: browserStorage({ prefix: "myapp" }),
  defaults: {
    "feature.dark_mode": false,
    "feature.new_checkout": false,
    "app.upload_limit": 50,
  },
  context: autoContext({ userId: "user_123" }),
  pollInterval: 600_000,
});
```

### Tips by Scale

#### Small teams (< 1,000 users) — Stay on free tier

- Use default settings — you'll never exceed free limits
- Set all your defaults in `initConfig` — the SDK serves them instantly without any API call
- The [optimistic loading strategy](/guide/loading-strategies) fetches in the background while defaults are served

#### Medium scale (1K–50K users) — Optimize refresh

```typescript
const flags = initConfig({
  clientId: "cid_xxx",
  baseUrl: "https://your-project.web.app/api",
  defaults: {/* all your flags */},
  pollInterval: 900_000, // 15 min — most flag changes don't need instant propagation
});
```

- Longer `pollInterval` = fewer version checks
- Add `storage: browserStorage()` to persist cache across page reloads
- Consider `loadingStrategy: "deferred"` via `createConfig` only if you need advanced control

#### Large scale (50K+ users) — Minimize function invocations

```typescript
const flags = initConfig({
  clientId: "cid_xxx",
  baseUrl: "https://your-project.web.app/api",
  defaults: {/* all your flags */},
  pollInterval: 0, // Disable polling entirely
});

// Only refresh when YOU decide (e.g., on route change)
router.on("routeChange", () => flags.refresh());
```

- Disable automatic polling and trigger `refresh()` only at meaningful moments
- The CDN handles the heavy lifting — most requests never reach your function
- Add `storage: browserStorage({ defaultTtl: 7 * 86_400_000 })` for long-lived cache

### Cost Breakdown by API Call

| Endpoint                       | Firestore Reads                     | Function Cost | CDN-Cacheable?         |
| ------------------------------ | ----------------------------------- | ------------- | ---------------------- |
| `/api/v1/version`              | 1 (environment doc)                 | ~$0.0000004   | ✅ 15s                 |
| `/api/v1/config` (server mode) | 2-3 (clientId + configs + segments) | ~$0.0000012   | ❌ (varies by context) |
| `/api/v1/config` (client mode) | 2-3 (same)                          | ~$0.0000012   | ✅ 60s                 |

At the free tier limits (2M invocations/month + 50K reads/day), you can serve **~50,000 active users** polling every 5 minutes at zero cost.

### What NOT to Do

| Anti-Pattern                             | Why It's Expensive                                   | Fix                                                                           |
| ---------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| Calling `refresh()` on every render      | Bypasses deduplication if renders are >30s apart     | Let the poll interval handle it                                               |
| Using `pollInterval: 1000` (1s)          | Each poll = function invocation                      | Use 300,000+ (5 min or more)                                                  |
| Not setting `defaults`                   | Forces a blocking fetch before app can render        | Always provide defaults                                                       |
| Creating multiple `initConfig` instances | Each instance polls independently, multiplying costs | Use one singleton                                                             |
| Not calling `destroy()` on unmount (SPA) | Timer keeps polling after navigation                 | Use `createConfig` with `destroy()`, or use a single `initConfig` at app root |

## Related

- [Performance Tuning](/guide/performance) — Region selection and latency optimization
- [Self-Hosting Guide](/guide/self-hosting) — Full deployment setup
- [Storage & Caching](/guide/storage) — Cache adapters that reduce API calls
- [SDK Reference](/api/) — Full API documentation
