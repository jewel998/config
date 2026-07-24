import type { CacheStorage } from "./cache/storage";
import type { RemoteConfigProvider } from "./remote/provider";
import type { ConfigDefinition, ConfigResolveContext } from "./types";
export type {
  ConfigDefinition,
  ConfigResolveContext,
  ConfigVersionRecord,
  EnvironmentRecord,
  ProjectRecord,
  TenantRecord,
} from "./types";
export type { ConfigScope, ConfigSourceMode } from "./types";
export { createExampleClient } from "./example";
export interface ConfigClient {
  getValue<T>(
    key: string,
    context?: ConfigResolveContext,
  ): Promise<T | undefined>;
  getFlag(key: string, context?: ConfigResolveContext): Promise<boolean>;
  refresh(): Promise<void>;
}
export interface ConfigClientOptions {
  definitions: ConfigDefinition[];
  storage?: CacheStorage;
  remoteProvider?: RemoteConfigProvider;
}
export declare const createConfigClient: (
  options: ConfigClientOptions,
) => ConfigClient;
