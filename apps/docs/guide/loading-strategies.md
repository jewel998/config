# Loading Strategies

Loading strategies control **when and how** the SDK fetches configuration data from your API. The strategy you choose affects your app's startup behavior, perceived performance, and how users experience flag changes.

## The Three Strategies

| Strategy        | Init Behavior                        | First `get()` Returns   | Network Activity on Init         |
| --------------- | ------------------------------------ | ----------------------- | -------------------------------- |
| **Optimistic**  | Synchronous (instant)                | Cached value or default | Background fetch (non-blocking)  |
| **Pessimistic** | Async (blocks until fetch completes) | Real server value       | Blocking fetch with timeout      |
| **Deferred**    | Synchronous (instant)                | Default only            | None — you control when to fetch |

## Optimistic (Default)

**"Serve something immediately, update in the background."**

This is the default strategy and the right choice for most apps. The SDK returns instantly with cached or default values, then fetches fresh data in the background. When new data arrives, it emits an `updated` event.

### How It Works

```
1. initConfig() called
2. Check cache (memory/localStorage) → found? Return cached data
3. Return immediately (synchronous) with cached data or defaults
4. Fire background fetch (non-blocking)
5. API responds → update cache → emit "updated" event
```

### When to Use

- **Most frontend apps** — users see the UI immediately, no loading spinner needed
- **Apps with good defaults** — the default values are acceptable for the first few hundred milliseconds
- **Performance-critical pages** — no render-blocking network requests

### Code Example

```typescript
import { initConfig, autoContext } from "@jewel998/config";

// initConfig always uses optimistic strategy
const flags = initConfig({
  clientId: "cid_xxx",
  baseUrl: "https://your-project.web.app/api",
  defaults: {
    "feature.dark_mode": false,
    "feature.new_checkout": false,
    "app.upload_limit": 50,
  },
  context: autoContext({ userId: "user_123", plan: "pro" }),
});

// This returns IMMEDIATELY — no waiting
flags.get("feature.dark_mode"); // → false (from defaults or cache)

// When the API responds, values update silently
flags.on("updated", ({ keys }) => {
  console.log("Flags updated:", keys);
  // Re-render components that depend on these flags
});
```

### With `createConfig`

```typescript
import { createConfig } from "@jewel998/config";

const config = createConfig({
  clientId: "cid_xxx",
  baseUrl: "https://your-project.web.app/api",
  loadingStrategy: "optimistic", // This is the default
  context: { userId: "user_123" },
});

config.getValue("feature.dark_mode", false); // → false (instant)
```

### Tradeoffs

| Advantage                  | Disadvantage                                                 |
| -------------------------- | ------------------------------------------------------------ |
| Zero startup delay         | Brief window where defaults are shown instead of real values |
| No loading spinners needed | UI may "flash" when real values differ from defaults         |
| Works offline (from cache) | First-ever load with no cache always shows defaults          |

### Handling the Flash

If your defaults differ from real values, users may see a brief flash (e.g., light mode → dark mode switch). Mitigations:

1. **Set accurate defaults** — if 90% of users get `dark_mode: true`, set the default to `true`
2. **Use `browserStorage()`** — cached values persist across page loads, eliminating the flash on return visits
3. **Hide the affected UI briefly** — use CSS transitions or a skeleton screen for the first 200ms

```typescript
import { initConfig, browserStorage, autoContext } from "@jewel998/config";

const flags = initConfig({
  clientId: "cid_xxx",
  baseUrl: "https://your-project.web.app/api",
  storage: browserStorage({ prefix: "myapp" }), // Persist cache in localStorage
  defaults: { "feature.dark_mode": true }, // Match the most common value
  context: autoContext({ userId: "user_123" }),
});
```

---

## Pessimistic

**"Don't render until we have real data."**

The SDK blocks initialization until the API responds (or a timeout is reached). Your app waits, but when it renders, it has the correct flag values from the start.

### How It Works

```
1. createConfig() called
2. Start fetch to /api/getConfig
3. Wait for response (or timeout)
4. If success: return with real data → no flash, no defaults
5. If timeout/error: fall back to cache or defaults → emit "fetchError"
```

### When to Use

- **Apps where showing wrong values is worse than a brief delay** — e.g., paywall logic, pricing display, access control decisions
- **Server-rendered apps that hydrate** — fetch during SSR, hydrate with real values
- **Splash screen / loading state apps** — you already have a loading UI, so waiting for flags costs nothing extra
- **Critical flag-gated flows** — checkout, onboarding, feature gates that affect UX significantly

### Code Example

```typescript
import { createConfig } from "@jewel998/config";

async function initApp() {
  const config = createConfig({
    clientId: "cid_xxx",
    baseUrl: "https://your-project.web.app/api",
    loadingStrategy: "pessimistic",
    timeout: 5000, // Give up after 5 seconds
    context: { userId: "user_123", attributes: { plan: "pro" } },
  });

  // This BLOCKS until the API responds or timeout is reached
  await config.ready(); // Wait for initialization to complete

  // Now you have REAL values — no flash, no defaults
  const showNewCheckout = config.getFlag("feature.new_checkout"); // → true (from server)

  renderApp(showNewCheckout);
}

initApp();
```

### With a Loading State

```typescript
// Show loading UI while waiting for flags
document.getElementById("app")!.innerHTML =
  "<div class='spinner'>Loading...</div>";

const config = createConfig({
  clientId: "cid_xxx",
  baseUrl: "https://your-project.web.app/api",
  loadingStrategy: "pessimistic",
  timeout: 3000,
  context: { userId: "user_123" },
});

await config.ready();

// Flags loaded — render the real UI
renderApp();
```

### Timeout Behavior

If the API doesn't respond within the `timeout` period:

1. The SDK emits a `fetchError` event with a `TimeoutError`
2. Falls back to cached data (if using `browserStorage`) or empty data
3. Returns with whatever is available — **it does not throw**

```typescript
config.on("fetchError", ({ error }) => {
  if (error.name === "TimeoutError") {
    console.warn("Config fetch timed out — using cached/default values");
  }
});
```

### Tradeoffs

| Advantage                                | Disadvantage                             |
| ---------------------------------------- | ---------------------------------------- |
| No flash — correct values from the start | Adds latency to app startup              |
| No "wrong state" shown to users          | Bad UX if API is slow or down            |
| Simpler code — no need to handle updates | Requires a loading state                 |
| Deterministic — app always has real data | Timeout fallback may still show defaults |

### Recommended Timeout Values

| Scenario                        | Timeout | Rationale                                           |
| ------------------------------- | ------- | --------------------------------------------------- |
| Fast API (same region, CDN hit) | 2000ms  | Most responses complete in < 200ms                  |
| Standard deployment             | 5000ms  | Accounts for cold starts and network variance       |
| Global users, distant regions   | 8000ms  | Cross-continent latency + cold function start       |
| Behind splash screen            | 10000ms | User is already waiting; maximize chance of success |

---

## Deferred

**"Don't fetch anything — I'll tell you when."**

The SDK initializes with zero network activity. No fetch, no cache read, nothing. You trigger data loading explicitly when you're ready. Useful for advanced scenarios where flag fetching depends on other app state.

### How It Works

```
1. createConfig() called
2. Return immediately with empty data (no network, no cache)
3. All get() calls return undefined or provided defaults
4. You call refresh() when ready → triggers fetch
5. API responds → cache populated → "updated" event emitted
```

### When to Use

- **Consent-gated apps (GDPR)** — don't send user context until consent is granted
- **Multi-step initialization** — you need user data from another API before you can build the flag context
- **Conditional flag loading** — only fetch flags for certain user roles or app sections
- **Testing and mocking** — initialize without network access, inject values manually

### Code Example

```typescript
import { createConfig } from "@jewel998/config";

const config = createConfig({
  clientId: "cid_xxx",
  baseUrl: "https://your-project.web.app/api",
  loadingStrategy: "deferred",
});

// SDK is idle — no network activity
config.getValue("feature.dark_mode"); // → undefined

// Later, when you have the user's context ready:
async function onUserLogin(user) {
  config.setContext({
    userId: user.id,
    attributes: { plan: user.plan, country: user.country },
  });

  // NOW fetch flags
  await config.refresh();

  // Values are available
  config.getFlag("feature.dark_mode"); // → true (from server)
}
```

### GDPR / Consent Pattern

```typescript
const config = createConfig({
  clientId: "cid_xxx",
  baseUrl: "https://your-project.web.app/api",
  loadingStrategy: "deferred",
  consentAware: true,
});

// Before consent: SDK does nothing, returns undefined for all flags
showConsentBanner();

// After user grants consent:
function onConsentGranted() {
  config.setContext({
    userId: getCurrentUserId(),
    consentGranted: true,
    attributes: { plan: "pro" },
  });
  config.refresh(); // NOW safe to send context to server
}
```

### Conditional Loading

```typescript
const config = createConfig({
  clientId: "cid_xxx",
  baseUrl: "https://your-project.web.app/api",
  loadingStrategy: "deferred",
});

// Only load flags when user navigates to the dashboard
router.on("/dashboard", async () => {
  if (!config.getAll().length) {
    config.setContext({ userId: currentUser.id });
    await config.refresh();
  }
  renderDashboard();
});
```

### Tradeoffs

| Advantage                                    | Disadvantage                             |
| -------------------------------------------- | ---------------------------------------- |
| Zero network until you decide                | All values are undefined until you fetch |
| Full control over timing                     | More code to manage initialization       |
| GDPR-friendly — no data sent without consent | Can't use flags before explicit fetch    |
| Testable — easy to mock                      | Easy to forget to call refresh()         |

---

## Choosing the Right Strategy

### Decision Flowchart

```
Do you need real flag values BEFORE rendering?
├── Yes → Are you willing to show a loading state?
│   ├── Yes → PESSIMISTIC
│   └── No → OPTIMISTIC (with browserStorage for cache persistence)
└── No → Does fetching depend on external state (consent, login)?
    ├── Yes → DEFERRED
    └── No → OPTIMISTIC
```

### By App Type

| App Type                      | Recommended Strategy        | Why                                          |
| ----------------------------- | --------------------------- | -------------------------------------------- |
| Marketing site / landing page | Optimistic                  | Speed matters most; defaults are fine        |
| SaaS dashboard                | Optimistic + browserStorage | Return visits use cache instantly            |
| E-commerce checkout           | Pessimistic                 | Wrong pricing/features = lost revenue        |
| Mobile web app                | Optimistic                  | Network may be slow; show UI immediately     |
| Admin panel                   | Pessimistic                 | Users expect a brief load; accuracy matters  |
| GDPR-regulated app (EU)       | Deferred + consentAware     | Must wait for consent before sending context |
| Micro-frontend / widget       | Deferred                    | Parent app controls when to initialize       |
| A/B test critical path        | Pessimistic                 | Must bucket user correctly from the start    |

### Combined Patterns

You can combine strategies with other SDK features for optimal behavior:

#### Optimistic + browserStorage (Best for Most Apps)

```typescript
import { initConfig, browserStorage, autoContext } from "@jewel998/config";

const flags = initConfig({
  clientId: "cid_xxx",
  baseUrl: "https://your-project.web.app/api",
  storage: browserStorage({ prefix: "myapp" }),
  defaults: { "feature.dark_mode": false },
  context: autoContext({ userId: "user_123" }),
});
// First visit: shows defaults, then updates
// Return visits: shows CACHED values instantly (no flash!)
```

#### Pessimistic + Short Timeout + Cache Fallback

```typescript
const config = createConfig({
  clientId: "cid_xxx",
  baseUrl: "https://your-project.web.app/api",
  loadingStrategy: "pessimistic",
  timeout: 2000, // Short timeout — don't wait too long
  storage: browserStorage({ prefix: "myapp" }),
});
// Tries to fetch real data in 2s
// If it fails, seamlessly uses cached data from last session
```

#### Deferred → Pessimistic Pattern (Manual Control)

```typescript
const config = createConfig({
  clientId: "cid_xxx",
  baseUrl: "https://your-project.web.app/api",
  loadingStrategy: "deferred",
});

// When you're ready, fetch and wait
async function loadFlags(userId: string) {
  config.setContext({ userId, attributes: { plan: "pro" } });
  await config.refresh(); // Blocks until data arrives
  return config.getAll();
}
```

---

## Summary

|                          | Optimistic                    | Pessimistic               | Deferred                    |
| ------------------------ | ----------------------------- | ------------------------- | --------------------------- |
| **Init speed**           | Instant (sync)                | Blocks (async)            | Instant (sync)              |
| **First value**          | Default or cached             | Real from server          | undefined                   |
| **Network on init**      | Background (non-blocking)     | Blocking                  | None                        |
| **Flash risk**           | Yes (mitigated by cache)      | No                        | No                          |
| **Loading state needed** | No                            | Yes                       | Depends on your flow        |
| **Offline support**      | Yes (cache)                   | Partial (timeout → cache) | No data until fetch         |
| **Available via**        | `initConfig` + `createConfig` | `createConfig` only       | `createConfig` only         |
| **Best for**             | Most apps                     | Critical-path decisions   | Consent/conditional loading |
