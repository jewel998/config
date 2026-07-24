# Storage API

Importable from `@jewel998/config/storage`.

## memoryStorage

```ts
function memoryStorage(): CacheStorage;
```

Creates an in-memory cache backed by a `Map`. Suitable for testing and server-side use.

## browserStorage

```ts
function browserStorage(storageKey?: string): CacheStorage;
```

Creates a `localStorage`-backed cache. Falls back to `memoryStorage()` in non-browser environments.

**Parameters:**

- `storageKey` — Prefix for all stored keys. Defaults to `"@jewel998/config"`.

## createDriverStorage

```ts
function createDriverStorage(
  driver: CacheDriver,
  storageKey?: string,
): CacheStorage;
```

Wraps a custom `CacheDriver` into the `CacheStorage` interface.

## CacheDriver

```ts
interface CacheDriver {
  name: string;
  getItem<T>(key: string): Promise<T | undefined>;
  setItem<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
}
```
