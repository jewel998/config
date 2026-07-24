# Storage Adapters

The config package uses a pluggable `CacheStorage` interface for local persistence.

## Built-in Adapters

### Memory Storage

In-memory store useful for testing or server-side environments:

```ts
import { memoryStorage } from "@jewel998/config/storage";

const storage = memoryStorage();
```

### Browser Storage

Uses `localStorage` with automatic fallback to memory storage in non-browser environments:

```ts
import { browserStorage } from "@jewel998/config/storage";

const storage = browserStorage();

// Custom storage key prefix
const storage = browserStorage("my-app/config");
```

### Custom Driver

Implement the `CacheDriver` interface for any storage backend:

```ts
import { createDriverStorage } from "@jewel998/config/storage";

const driver = {
  name: "indexeddb",
  getItem: async (key) => {
    /* ... */
  },
  setItem: async (key, value) => {
    /* ... */
  },
  removeItem: async (key) => {
    /* ... */
  },
};

const storage = createDriverStorage(driver);
```

## CacheStorage Interface

```ts
interface CacheStorage {
  get<T>(key: string): Promise<T | undefined> | T | undefined;
  set<T>(key: string, value: T): Promise<void> | void;
  delete(key: string): Promise<void> | void;
}
```
