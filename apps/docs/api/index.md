# createConfigClient

The main entry point for the config package.

## Signature

```ts
function createConfigClient(options: ConfigClientOptions): ConfigClient;
```

## ConfigClientOptions

| Property         | Type                   | Required | Description                     |
| ---------------- | ---------------------- | -------- | ------------------------------- |
| `definitions`    | `ConfigDefinition[]`   | Yes      | Array of config key definitions |
| `storage`        | `CacheStorage`         | No       | Local cache storage adapter     |
| `remoteProvider` | `RemoteConfigProvider` | No       | Remote config provider adapter  |

## ConfigClient

| Method     | Signature                                                           | Description                         |
| ---------- | ------------------------------------------------------------------- | ----------------------------------- |
| `getValue` | `<T>(key: string, context?: ConfigResolveContext) => Promise<T>`    | Resolve a config value              |
| `getFlag`  | `(key: string, context?: ConfigResolveContext) => Promise<boolean>` | Resolve a boolean flag              |
| `refresh`  | `() => Promise<void>`                                               | Sync remote values into local cache |

## ConfigDefinition

```ts
interface ConfigDefinition<T = unknown> {
  key: string;
  defaultValue: T;
  sourceMode: "offline" | "remote" | "hybrid";
  scope: "tenant" | "project" | "environment";
  fallbackValue?: T;
}
```

## ConfigResolveContext

```ts
interface ConfigResolveContext {
  tenantId?: string;
  projectId?: string;
  environment?: string;
}
```
