# Storage & Caching

> See also: [Loading Strategies](/guide/loading-strategies) · [SDK Reference](/api/) · [Cost & Scaling](/guide/cost)

The SDK provides pluggable storage adapters that control where resolved config values are cached. Choosing the right adapter determines whether configs survive page reloads, how long they persist, and how much network traffic your app generates. For how caching interacts with initialization, see [Loading Strategies](/guide/loading-strategies).

## Storage Adapters

### Memory Storage (default)

```typescript
import { initConfig } from "@jewel998/config";

const flags = initConfig({
  clientId: "cid_xxx",
  // memoryStorage is used by default — no need to specify
});
```

| Property                     | Value                           |
| ---------------------------- | ------------------------------- |
| Persists across page reloads | ❌ No                           |
| Persists across tabs         | ❌ No                           |
| TTL                          | 7 days (or until page unload)   |
| Storage limit                | Limited by available RAM        |
| Best for                     | SPAs that always fetch on mount |

### Browser Storage (localStorage)

```typescript
import { initConfig, browserStorage } from "@jewel998/config";

const flags = initConfig({
  clientId: "cid_xxx",
  storage: browserStorage(),
});
```

| Property                     | Value                                  |
| ---------------------------- | -------------------------------------- |
| Persists across page reloads | ✅ Yes                                 |
| Persists across tabs         | ✅ Yes (shared localStorage)           |
| TTL                          | 7 days (configurable)                  |
| Storage limit                | ~5-10 MB (browser limit)               |
| Best for                     | Reducing API calls, offline-first apps |

#### Browser Storage Options

```typescript
import { browserStorage } from "@jewel998/config";

const storage = browserStorage({
  prefix: "myapp-flags", // localStorage key prefix (default: "@jewel998/config")
  defaultTtl: 86_400_000, // 24 hours in ms (default: 7 days)
});
```

| Option       | Type     | Default                | Description                                                                                                |
| ------------ | -------- | ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| `prefix`     | `string` | `"@jewel998/config"`   | Key prefix in localStorage. Use unique prefixes if multiple SDK instances exist.                           |
| `defaultTtl` | `number` | `604_800_000` (7 days) | How long cached values are valid in ms. After expiry, next read returns undefined and triggers a re-fetch. |

## Caching Strategies

### Strategy 1: Fresh on Every Visit (default)

```typescript
const flags = initConfig({
  clientId: "cid_xxx",
  defaults: { "feature.x": false },
  // No storage specified = memoryStorage (lost on reload)
});
```

**Behavior:** Every page load triggers a fresh API call. Defaults are served instantly until the API responds (~100-300ms).

**Best for:** Apps where configs change frequently and you want guaranteed freshness.

**Cost:** 1 API call per page load per user.

### Strategy 2: Persist Across Sessions (recommended)

```typescript
import { initConfig, browserStorage } from "@jewel998/config";

const flags = initConfig({
  clientId: "cid_xxx",
  defaults: { "feature.x": false },
  storage: browserStorage(),
  pollInterval: 300_000, // Check for updates every 5 min
});
```

**Behavior:** First visit fetches from API and stores in localStorage. Subsequent visits serve cached values instantly (0ms), then version-check in background. Only re-fetches if version changed.

**Best for:** Most production apps. Best balance of freshness and cost.

**Cost:** 1 version check per 5 minutes (tiny), full fetch only on actual changes.

### Strategy 3: Long-Lived Cache (cost-optimized)

```typescript
import { initConfig, browserStorage } from "@jewel998/config";

const flags = initConfig({
  clientId: "cid_xxx",
  defaults: { "feature.x": false },
  storage: browserStorage({ defaultTtl: 7 * 86_400_000 }), // 7-day cache
  pollInterval: 0, // Disable automatic polling
});

// Only refresh on meaningful user actions
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    flags.refresh(); // Version-gated — skips if unchanged
  }
});
```

**Behavior:** Cache persists for 7 days. No automatic polling. Refresh only when the user returns to the tab or you explicitly trigger it.

**Best for:** Apps with stable configs that rarely change, or high-traffic apps minimizing costs.

**Cost:** Near-zero ongoing cost. API only called when user returns to tab AND version has changed.

### Strategy 4: Offline-First

```typescript
import { initConfig, browserStorage } from "@jewel998/config";

const flags = initConfig({
  clientId: "cid_xxx",
  defaults: { "feature.x": false },
  storage: browserStorage({ defaultTtl: 30 * 86_400_000 }), // 30-day cache
  pollInterval: 0,
});

// Handle offline gracefully
flags.on("fetchError", ({ error }) => {
  if (!navigator.onLine) {
    console.log("Offline — using cached config values");
  }
});

// Refresh only when online
window.addEventListener("online", () => flags.refresh());
```

**Behavior:** Very long cache TTL ensures the app works offline. When connectivity returns, it refreshes.

**Best for:** PWAs, mobile web apps, or apps used in low-connectivity environments.

## Custom Storage Adapters

You can implement your own storage adapter by conforming to the `CacheStorage` interface:

```typescript
interface CacheStorage {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
}
```

### Example: SessionStorage Adapter

```typescript
const sessionStorage = (): CacheStorage => {
  const prefix = "@jewel998/config:";

  return {
    get<T>(key: string): T | undefined {
      const raw = window.sessionStorage.getItem(prefix + key);
      if (!raw) return undefined;
      const { value, expiresAt } = JSON.parse(raw);
      if (Date.now() > expiresAt) {
        window.sessionStorage.removeItem(prefix + key);
        return undefined;
      }
      return value as T;
    },
    set<T>(key: string, value: T, ttl = 604_800_000): void {
      window.sessionStorage.setItem(
        prefix + key,
        JSON.stringify({ value, expiresAt: Date.now() + ttl }),
      );
    },
    delete(key: string): void {
      window.sessionStorage.removeItem(prefix + key);
    },
    clear(): void {
      for (let i = window.sessionStorage.length - 1; i >= 0; i--) {
        const k = window.sessionStorage.key(i);
        if (k?.startsWith(prefix)) window.sessionStorage.removeItem(k);
      }
    },
  };
};
```

### Example: IndexedDB Adapter (for large configs)

For apps with hundreds of config keys or large JSON values, localStorage's 5MB limit may not be enough. Use IndexedDB:

```typescript
// Simplified — use a library like idb for production
import { openDB } from "idb";

const idbStorage = async (): Promise<CacheStorage> => {
  const db = await openDB("config-cache", 1, {
    upgrade(db) {
      db.createObjectStore("flags");
    },
  });

  return {
    get<T>(key: string): T | undefined {
      // Note: IndexedDB is async — consider wrapping with a sync memory layer
      return undefined; // Simplified
    },
    set<T>(key: string, value: T, ttl?: number): void {
      db.put("flags", { value, expiresAt: Date.now() + (ttl ?? 604_800_000) }, key);
    },
    delete(key: string): void {
      db.delete("flags", key);
    },
    clear(): void {
      db.clear("flags");
    },
  };
};
```

## How Caching Interacts with Other Features

| Feature                   | With Memory                            | With Browser Storage                                                |
| ------------------------- | -------------------------------------- | ------------------------------------------------------------------- |
| **First page load**       | API call (defaults served instantly)   | Cached values served instantly if available, API call in background |
| **Page reload**           | API call again (cache lost)            | Cached values served, version check in background                   |
| **`refresh()`**           | Version check → conditional full fetch | Same, but result persists to localStorage                           |
| **Circuit breaker (403)** | Defaults only for 5 min                | Cached values for 5 min (much better UX)                            |
| **Offline**               | Defaults only                          | Last-known-good values from cache                                   |

## Clearing the Cache

```typescript
// Clear the SDK's cache (forces next read to re-fetch)
import { browserStorage } from "@jewel998/config";
const storage = browserStorage({ prefix: "myapp" });
storage.clear();

// Or clear all localStorage for the SDK
localStorage.removeItem("@jewel998/config:__all__");
```

## Related

- [Loading Strategies](/guide/loading-strategies) — Choose optimistic, pessimistic, or deferred initialization
- [SDK Reference](/api/) — Full API documentation for storage adapter options
- [Self-Hosting Guide](/guide/self-hosting) — Cost optimization tips that leverage caching
- [GDPR](/compliance/gdpr) — Data minimization considerations for cache storage
- [Configuration Scopes](/guide/scopes) — How scoped cache keys are built and resolved
