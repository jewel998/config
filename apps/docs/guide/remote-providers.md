# Remote Providers

Remote providers fetch configuration values from an external source.

## RemoteConfigProvider Interface

```ts
interface RemoteConfigProvider {
  getValue<T>(key: string): Promise<T | undefined>;
  refresh(): Promise<void>;
}
```

## Firebase Adapter

The built-in Firebase adapter works with any async fetcher function:

```ts
import { createFirebaseRemoteConfigProvider } from "@jewel998/config/remote/firebase";

const provider = createFirebaseRemoteConfigProvider({
  fetcher: async (key) => {
    // Fetch from Firebase Remote Config, Firestore, or any source
    const snapshot = await remoteConfig.getValue(key);
    return snapshot.asBoolean();
  },
});
```

## Custom Provider

Build your own provider by implementing the interface:

```ts
import type { RemoteConfigProvider } from "@jewel998/config/remote";

const myProvider: RemoteConfigProvider = {
  getValue: async (key) => {
    const response = await fetch(`/api/config/${key}`);
    return response.json();
  },
  refresh: async () => {
    // Optionally pre-fetch or invalidate
  },
};
```
