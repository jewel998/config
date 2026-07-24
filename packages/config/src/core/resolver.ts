import type { ConfigDefinition, ConfigResolveContext } from "../index";

export interface ConfigResolverOptions {
  definitions: ConfigDefinition[];
  cache?: Record<string, unknown>;
  remote?: Record<string, unknown>;
}

export const resolveConfigValue = <T>(
  key: string,
  options: ConfigResolverOptions,
  _context?: ConfigResolveContext,
): T | undefined => {
  const definition = options.definitions.find((entry) => entry.key === key) as
    | ConfigDefinition<T>
    | undefined;

  if (!definition) {
    return undefined;
  }

  const cachedValue = options.cache?.[key] as T | undefined;
  const remoteValue = options.remote?.[key] as T | undefined;

  if (definition.sourceMode === "offline") {
    return cachedValue ?? definition.defaultValue ?? definition.fallbackValue;
  }

  if (definition.sourceMode === "remote") {
    return remoteValue ?? cachedValue ?? definition.defaultValue ?? definition.fallbackValue;
  }

  return cachedValue ?? remoteValue ?? definition.defaultValue ?? definition.fallbackValue;
};
