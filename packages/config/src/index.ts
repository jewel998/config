import { resolveConfigValue } from "./core/resolver";
import type { CacheStorage } from "./cache/storage";

const buildScopedKey = (
  key: string,
  context?: ConfigResolveContext,
): string => {
  if (!context) {
    return key;
  }

  const parts = [key];

  if (context.tenantId) {
    parts.push(`tenant:${context.tenantId}`);
  }

  if (context.projectId) {
    parts.push(`project:${context.projectId}`);
  }

  if (context.environment) {
    parts.push(`environment:${context.environment}`);
  }

  return parts.join(":");
};

const resolveCachedValue = async <T>(
  storage: CacheStorage,
  key: string,
  context?: ConfigResolveContext,
): Promise<T | undefined> => {
  const candidates = [key];

  if (context?.projectId) {
    candidates.push(`${key}:${context.projectId}`);
    candidates.push(`${key}:project:${context.projectId}`);
  }

  if (context?.tenantId) {
    candidates.push(`${key}:${context.tenantId}`);
    candidates.push(`${key}:tenant:${context.tenantId}`);
  }

  if (context?.environment) {
    candidates.push(`${key}:${context.environment}`);
    candidates.push(`${key}:environment:${context.environment}`);
  }

  if (context?.tenantId && context?.projectId) {
    candidates.push(`${key}:${context.tenantId}:${context.projectId}`);
  }

  candidates.push(buildScopedKey(key, context));

  for (const candidate of candidates) {
    const value = await storage.get<T>(candidate);
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
};
import type { RemoteConfigProvider } from "./remote/provider";
import type {
  ConfigDefinition,
  ConfigResolveContext,
  ConfigVersionRecord,
  EnvironmentRecord,
  ProjectRecord,
  TenantRecord,
} from "./types";

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

export const createConfigClient = (
  options: ConfigClientOptions,
): ConfigClient => {
  const storage = options.storage;
  const remoteProvider = options.remoteProvider;
  const definitions = options.definitions;

  const getValue = async <T>(
    key: string,
    context?: ConfigResolveContext,
  ): Promise<T | undefined> => {
    if (!storage) {
      return undefined;
    }

    const cachedValue = await resolveCachedValue<T>(storage, key, context);
    const remoteValue = remoteProvider
      ? await remoteProvider.getValue<T>(key)
      : undefined;

    return resolveConfigValue<T>(key, {
      definitions,
      cache: cachedValue !== undefined ? { [key]: cachedValue } : {},
      remote: remoteValue !== undefined ? { [key]: remoteValue } : {},
    });
  };

  return {
    getValue,
    getFlag: async (key: string, context?: ConfigResolveContext) => {
      const value = await getValue<boolean>(key, context);
      return Boolean(value);
    },
    refresh: async () => {
      if (!storage || !remoteProvider) {
        return;
      }

      const values = definitions.map(async (definition) => {
        const remoteValue = await remoteProvider.getValue(definition.key);
        if (remoteValue !== undefined) {
          await storage.set(definition.key, remoteValue);
        }
      });

      await Promise.all(values);
    },
  };
};
