import type {
  ConfigVersionRecord,
  EnvironmentRecord,
  ProjectRecord,
} from "../types";

import type { ConfigManagerBackend } from "./manager";

/**
 * In-memory backend for testing and local development.
 */
export const createMemoryBackend = (): ConfigManagerBackend => {
  const projects: ProjectRecord[] = [];
  const environments: EnvironmentRecord[] = [];
  const versions: ConfigVersionRecord[] = [];

  let idCounter = 0;
  const nextId = () => {
    idCounter++;
    return `mem-${idCounter.toString().padStart(4, "0")}`;
  };

  return {
    createProject: async (name, ownerId) => {
      const project: ProjectRecord = {
        id: nextId(),
        name,
        ownerId,
        authorizedUsers: [ownerId],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      projects.push(project);
      return project;
    },

    deleteProject: async (projectId) => {
      const index = projects.findIndex((p) => p.id === projectId);
      if (index >= 0) {
        projects.splice(index, 1);
      }
    },

    listProjects: async (ownerId) =>
      projects.filter(
        (p) => p.ownerId === ownerId || p.authorizedUsers.includes(ownerId),
      ),

    createEnvironment: async (projectId, name) => {
      const environment: EnvironmentRecord = {
        id: nextId(),
        projectId,
        name,
        allowedDomains: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
