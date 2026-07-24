export type ConfigScope = "tenant" | "project" | "environment";
export type ConfigSourceMode = "offline" | "remote" | "hybrid";

export interface ConfigDefinition<T = unknown> {
  key: string;
  defaultValue: T;
  sourceMode: ConfigSourceMode;
  scope: ConfigScope;
  fallbackValue?: T;
}

export interface ConfigResolveContext {
  tenantId?: string;
  projectId?: string;
  environment?: string;
}

export interface TenantRecord {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface ProjectRecord {
  id: string;
  tenantId: string;
  name: string;
  createdAt: string;
}

export interface EnvironmentRecord {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
}

export interface ConfigVersionRecord {
  id: string;
  projectId: string;
  environmentId?: string;
  version: string;
  payload: Record<string, unknown>;
  publishedAt?: string;
}
