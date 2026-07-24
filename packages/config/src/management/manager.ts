import type {
  ConfigVersionRecord,
  EnvironmentRecord,
  ProjectRecord,
} from "../types";

export interface ConfigManagerBackend {
  createProject(name: string, ownerId: string): Promise<ProjectRecord>;
  deleteProject(projectId: string): Promise<void>;
  listProjects(ownerId: string): Promise<ProjectRecord[]>;

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
  projects: {
    create(name: string, ownerId: string): Promise<ProjectRecord>;
    delete(projectId: string): Promise<void>;
    list(ownerId: string): Promise<ProjectRecord[]>;
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
    projects: {
      create: (name, ownerId) => backend.createProject(name, ownerId),
      delete: (projectId) => backend.deleteProject(projectId),
      list: (ownerId) => backend.listProjects(ownerId),
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
