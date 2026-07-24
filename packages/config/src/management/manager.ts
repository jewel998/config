import type {
  ConfigVersionRecord,
  EnvironmentRecord,
  ProjectRecord,
  TenantRecord,
} from "../types";

export interface ConfigManagerBackend {
  createTenant(name: string, ownerId: string): Promise<TenantRecord>;
  deleteTenant(tenantId: string): Promise<void>;
  listTenants(ownerId: string): Promise<TenantRecord[]>;

  createProject(tenantId: string, name: string): Promise<ProjectRecord>;
  deleteProject(tenantId: string, projectId: string): Promise<void>;
  listProjects(tenantId: string): Promise<ProjectRecord[]>;

  createEnvironment(
    projectId: string,
    name: string,
  ): Promise<EnvironmentRecord>;
  deleteEnvironment(projectId: string, environmentId: string): Promise<void>;
  listEnvironments(projectId: string): Promise<EnvironmentRecord[]>;

  createVersion(
    projectId: string,
    version: string,
    payload: Record<string, unknown>,
    environmentId?: string,
  ): Promise<ConfigVersionRecord>;
  publishVersion(
    projectId: string,
    versionId: string,
  ): Promise<ConfigVersionRecord>;
  listVersions(projectId: string): Promise<ConfigVersionRecord[]>;
}

export interface ConfigManagerOptions {
  backend: ConfigManagerBackend;
}

export interface ConfigManager {
  tenants: {
    create(name: string, ownerId: string): Promise<TenantRecord>;
    delete(tenantId: string): Promise<void>;
    list(ownerId: string): Promise<TenantRecord[]>;
  };
  projects: {
    create(tenantId: string, name: string): Promise<ProjectRecord>;
    delete(tenantId: string, projectId: string): Promise<void>;
    list(tenantId: string): Promise<ProjectRecord[]>;
  };
  environments: {
    create(projectId: string, name: string): Promise<EnvironmentRecord>;
    delete(projectId: string, environmentId: string): Promise<void>;
    list(projectId: string): Promise<EnvironmentRecord[]>;
  };
  versions: {
    create(
      projectId: string,
      version: string,
      payload: Record<string, unknown>,
      environmentId?: string,
    ): Promise<ConfigVersionRecord>;
    publish(projectId: string, versionId: string): Promise<ConfigVersionRecord>;
    list(projectId: string): Promise<ConfigVersionRecord[]>;
  };
}

export const createConfigManager = (
  options: ConfigManagerOptions,
): ConfigManager => {
  const { backend } = options;

  return {
    tenants: {
      create: (name, ownerId) => backend.createTenant(name, ownerId),
      delete: (tenantId) => backend.deleteTenant(tenantId),
      list: (ownerId) => backend.listTenants(ownerId),
    },
    projects: {
      create: (tenantId, name) => backend.createProject(tenantId, name),
      delete: (tenantId, projectId) =>
        backend.deleteProject(tenantId, projectId),
      list: (tenantId) => backend.listProjects(tenantId),
    },
    environments: {
      create: (projectId, name) => backend.createEnvironment(projectId, name),
      delete: (projectId, environmentId) =>
        backend.deleteEnvironment(projectId, environmentId),
      list: (projectId) => backend.listEnvironments(projectId),
    },
    versions: {
      create: (projectId, version, payload, environmentId) =>
        backend.createVersion(projectId, version, payload, environmentId),
      publish: (projectId, versionId) =>
        backend.publishVersion(projectId, versionId),
      list: (projectId) => backend.listVersions(projectId),
    },
  };
};
