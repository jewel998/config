# Remote API

Importable from `@jewel998/config/remote` and `@jewel998/config/remote/firebase`.

## RemoteConfigProvider

```ts
interface RemoteConfigProvider {
  getValue<T>(key: string): Promise<T | undefined>;
  refresh(): Promise<void>;
}
```

## createRemoteConfigProvider

```ts
function createRemoteConfigProvider(): RemoteConfigProvider;
```

Creates a no-op provider that always returns `undefined`. Useful as a placeholder or for testing.

## createFirebaseRemoteConfigProvider

```ts
function createFirebaseRemoteConfigProvider(
  options?: FirebaseRemoteConfigOptions,
): RemoteConfigProvider;
```

Creates a remote provider that delegates to a `fetcher` function.

### FirebaseRemoteConfigOptions

| Property  | Type                                | Required | Description                     |
| --------- | ----------------------------------- | -------- | ------------------------------- |
| `fetcher` | `(key: string) => Promise<unknown>` | No       | Async function to fetch a value |
