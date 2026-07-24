import type {
  ConfigVersionRecord,
  EnvironmentRecord,
  ProjectRecord,
  TenantRecord,
} from "../types";

import type { ConfigManagerBackend } from "./manager";

/**
 * In-memory backend for testing and local development.
 */
export const createMemoryBackend = (): ConfigManagerBackend => {
  const tenants: TenantRecord[] = [];
  const projects: ProjectRecord[] = [];
  const environments: EnvironmentRecord[] = [];
  const versions: ConfigVersionRecord[] = [];

  let idCounter = 0;
  const nextId = () => {
    idCounter++;
    return `mem-${idCounter.toString().padStart(4, "0")}`;
  };

  return {
    createTenant: async (name, ownerId) => {
      const tenant: TenantRecord = {
        id: nextId(),
        name,
        ownerId,
        createdAt: new Date().toISOString(),
      };
      tenants.push(tenant);
      return tenant;
    },

    deleteTenant: async (tenantId) => {
      const index = tenants.findIndex((t) => t.id === tenantId);
      if (index >= 0) {
        tenants.splice(index, 1);
      }
    },

    listTenants: async (ownerId) =>
      tenants.filter((t) => t.ownerId === ownerId),

    createProject: async (tenantId, name) => {
      const project: ProjectRecord = {
        id: nextId(),
        tenantId,
        name,
        createdAt: new Date().toISOString(),
      };
      projects.push(project);
      return project;
    },

    deleteProject: async (_tenantId, projectId) => {
      const index = projects.findIndex((p) => p.id === projectId);
      if (index >= 0) {
        projects.splice(index, 1);
      }
    },

    listProjects: async (tenantId) =>
      projects.filter((p) => p.tenantId === tenantId),

    createEnvironment: async (projectId, name) => {
      const environment: EnvironmentRecord = {
        id: nextId(),
        projectId,
        name,
        createdAt: new Date().toISOString(),
      };
      environments.push(environment);
      return environment;
    },

    deleteEnvironment: async (_projectId, environmentId) => {
      const index = environments.findIndex((e) => e.id === environmentId);
      if (index >= 0) {
        environments.splice(index, 1);
      }
    },

    listEnvironments: async (projectId) =>
      environments.filter((e) => e.projectId === projectId),

    createVersion: async (projectId, version, payload, environmentId) => {
      const record: ConfigVersionRecord = {
        id: nextId(),
        projectId,
        environmentId,
        version,
        payload,
        publishedAt: undefined,
      };
      versions.push(record);
      return record;
    },

    publishVersion: async (_projectId, versionId) => {
      const record = versions.find((v) => v.id === versionId);
      if (!record) {
        throw new Error(`Version ${versionId} not found.`);
      }
      if (record.publishedAt) {
        throw new Error(`Version ${versionId} is already published.`);
      }
      record.publishedAt = new Date().toISOString();
      return record;
    },

    listVersions: async (projectId) =>
      versions.filter((v) => v.projectId === projectId),
  };
};
