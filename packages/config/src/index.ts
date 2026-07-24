// Core client
export { createConfigClient } from "./client";
export type { ConfigClient, ConfigClientOptions } from "./client";

// Types
export type {
  ConfigDefinition,
  ConfigResolveContext,
  ConfigScope,
  ConfigSourceMode,
  ConfigVersionRecord,
  EnvironmentRecord,
  ProjectRecord,
  TenantRecord,
} from "./types";

// Cache
export type { CacheStorage } from "./cache/storage";

// Remote
export type { RemoteConfigProvider } from "./remote/provider";

// Management
export { createConfigManager } from "./management/index";
export type { ConfigManager, ConfigManagerOptions } from "./management/index";
export type { ConfigManagerBackend } from "./management/manager";

// Example
export { createExampleClient } from "./example";
