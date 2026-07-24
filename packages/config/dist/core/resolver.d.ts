import type { ConfigDefinition, ConfigResolveContext } from "../index";
export interface ConfigResolverOptions {
  definitions: ConfigDefinition[];
  cache?: Record<string, unknown>;
  remote?: Record<string, unknown>;
}
export declare const resolveConfigValue: <T>(
  key: string,
  options: ConfigResolverOptions,
  _context?: ConfigResolveContext,
) => T | undefined;
