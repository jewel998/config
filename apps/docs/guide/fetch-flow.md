# SDK Fetch Flow

> See also: [Getting Started](/guide/getting-started) · [SDK Reference](/api/) · [Storage & Caching](/guide/storage)

The `initConfig` SDK uses a three-tier priority fetch model designed for projects with large flag sets (100s–1000s of keys). Only the keys you need are fetched first — everything else fills in progressively in the background.

## Three-Tier Model

```
Tier 1 — PREFETCH (init)    Declared via prefetch: [...] at initConfig time.
                             Fetched immediately. ready() blocks until complete.

Tier 2 — PAGE (runtime)     Declared via flags.prefetch(keys) per route/component.
                             Fire-and-forget. Emits "updated" per key on completion.

Tier 3 — IDLE               Full fetchAll() during browser idle time via
                             requestIdleCallback (fallback: setTimeout 200ms).
                             Fills in all remaining keys.
```

## Initialisation Flow

```mermaid
flowchart TD
    A([initConfig called]) --> B[Create transport\nTierFetcher\nTypedEventEmitter]
    B --> C{prefetch keys\ndeclared at init?}

    C -->|Yes| D[Tier 1: fetchKeys\nvia API immediately]
    C -->|No| E[ready resolves instantly]

    D --> F{Fetch succeeds?}
    F -->|Yes| G[Store in cache + memory\nEmit updated per key]
    F -->|No| H[Call onError handler\nFall back to defaults]

    G --> I[ready resolves]
    H --> I

    I --> J[Schedule idle fetch\nrequestIdleCallback]
    J --> K[Tier 3: fetchAll\nall remaining keys]
    K --> L[Store in cache + memory\nEmit updated per key]
```

## `flags.get(key)` Resolution

```mermaid
flowchart TD
    A([flags.get called]) --> B{Value in\nmemory or cache?}
    B -->|Yes| C([Resolves instantly])
    B -->|No| D{Default provided?}
    D -->|Yes| C
    D -->|No| E[Suspend Promise\nwait for idle fetch or refresh]
    E --> F{Key arrives within\nglobal timeout?}
    F -->|Yes| C
    F -->|No| G[onError called\nPromise rejects with SdkError]
```

## `flags.prefetch(keys)` — Tier 2

```mermaid
flowchart TD
    A([flags.prefetch called]) --> B{Key already fetched\nor in init prefetch?}
    B -->|Yes| C([No-op])
    B -->|No| D[Tier 2: fetchKeys\nfire-and-forget]
    D --> E{Fetch succeeds?}
    E -->|Yes| F[Store in cache\nEmit updated per key]
    E -->|No| G[Call onError]
```

## `flags.setContext()` Re-fetch

When `setContext()` is called, the SDK re-fetches only already-fetched keys (not all 1000+ keys) — debounced 100ms — in tier order:

```mermaid
flowchart TD
    A([setContext called]) --> B[Update context immediately]
    B --> C[Debounce 100ms]
    C --> D[Re-fetch Tier 1 keys]
    D --> E[Re-fetch Tier 2 keys]
    E --> F[Re-fetch Tier 3 keys]
    F --> G[Emit updated per key]
```

## `flags.refresh()` — Manual Re-fetch

`refresh()` re-fetches all already-fetched keys in tier order and resolves when complete.

## Version Polling

Every `pollInterval` (default 5 min) the SDK polls `/v1/version`. On version change, `refresh()` is called internally — only fetching already-fetched keys, never triggering a full re-fetch of all keys.

## Key Deduplication

| Scenario                                                   | Behaviour                                              |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| Key in init `prefetch` + also passed to `flags.prefetch()` | Skipped in runtime call — already tracked under Tier 1 |
| `flags.prefetch()` called twice with same key              | Second call is a no-op                                 |
| `get()` called on a key in-flight via prefetch             | Promise suspends and resumes when the fetch completes  |
| `get()` called with a default value                        | Resolves instantly — no network wait                   |

## Related

- [Getting Started](/guide/getting-started) — How to declare `prefetch` keys and use `ready()`
- [SDK Reference](/api/) — Full `Flags` interface including `get()`, `prefetch()`, `ready()`
- [Storage & Caching](/guide/storage) — How the cache layer interacts with the tier model
