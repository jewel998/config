import { describe, expect, it } from "vitest";

import { createConfigManager } from "./manager";
import { createMemoryBackend } from "./memory-backend";

describe("createConfigManager", () => {
  const setup = () => {
    const backend = createMemoryBackend();
    const manager = createConfigManager({ backend });
    return { manager };
  };

  describe("tenants", () => {
    it("creates and lists tenants", async () => {
      const { manager } = setup();

      const tenant = await manager.tenants.create("Acme Corp", "user-1");

      expect(tenant.name).toBe("Acme Corp");
      expect(tenant.ownerId).toBe("user-1");
      expect(tenant.id).toBeDefined();

      const list = await manager.tenants.list("user-1");
      expect(list).toHaveLength(1);
      expect(list[0]?.id).toBe(tenant.id);
    });

    it("deletes a tenant", async () => {
      const { manager } = setup();

      const tenant = await manager.tenants.create("Acme Corp", "user-1");
      await manager.tenants.delete(tenant.id);

      const list = await manager.tenants.list("user-1");
      expect(list).toHaveLength(0);
    });
  });

  describe("projects", () => {
    it("creates and lists projects within a tenant", async () => {
      const { manager } = setup();

      const tenant = await manager.tenants.create("Acme Corp", "user-1");
      const project = await manager.projects.create(tenant.id, "Dashboard");

      expect(project.name).toBe("Dashboard");
      expect(project.tenantId).toBe(tenant.id);

      const list = await manager.projects.list(tenant.id);
      expect(list).toHaveLength(1);
    });

    it("deletes a project", async () => {
      const { manager } = setup();

      const tenant = await manager.tenants.create("Acme Corp", "user-1");
      const project = await manager.projects.create(tenant.id, "Dashboard");
      await manager.projects.delete(tenant.id, project.id);

      const list = await manager.projects.list(tenant.id);
      expect(list).toHaveLength(0);
    });
  });

  describe("environments", () => {
    it("creates and lists environments within a project", async () => {
      const { manager } = setup();

      const tenant = await manager.tenants.create("Acme Corp", "user-1");
      const project = await manager.projects.create(tenant.id, "Dashboard");
      const env = await manager.environments.create(project.id, "staging");

      expect(env.name).toBe("staging");
      expect(env.projectId).toBe(project.id);

      const list = await manager.environments.list(project.id);
      expect(list).toHaveLength(1);
    });

    it("deletes an environment", async () => {
      const { manager } = setup();

      const tenant = await manager.tenants.create("Acme Corp", "user-1");
      const project = await manager.projects.create(tenant.id, "Dashboard");
      const env = await manager.environments.create(project.id, "staging");
      await manager.environments.delete(project.id, env.id);

      const list = await manager.environments.list(project.id);
      expect(list).toHaveLength(0);
    });
  });

  describe("versions", () => {
    it("creates a draft version", async () => {
      const { manager } = setup();

      const tenant = await manager.tenants.create("Acme Corp", "user-1");
      const project = await manager.projects.create(tenant.id, "Dashboard");

      const version = await manager.versions.create(project.id, "1.0.0", {
        "feature.beta": true,
      });

      expect(version.version).toBe("1.0.0");
      expect(version.publishedAt).toBeUndefined();
      expect(version.payload).toEqual({ "feature.beta": true });
    });

    it("publishes a version", async () => {
      const { manager } = setup();

      const tenant = await manager.tenants.create("Acme Corp", "user-1");
      const project = await manager.projects.create(tenant.id, "Dashboard");
      const version = await manager.versions.create(project.id, "1.0.0", {
        "feature.beta": true,
      });

      const published = await manager.versions.publish(project.id, version.id);

      expect(published.publishedAt).toBeDefined();
    });

    it("rejects publishing an already-published version", async () => {
      const { manager } = setup();

      const tenant = await manager.tenants.create("Acme Corp", "user-1");
      const project = await manager.projects.create(tenant.id, "Dashboard");
      const version = await manager.versions.create(project.id, "1.0.0", {
        "feature.beta": true,
      });

      await manager.versions.publish(project.id, version.id);

      await expect(
        manager.versions.publish(project.id, version.id),
      ).rejects.toThrow("already published");
    });

    it("lists versions for a project", async () => {
      const { manager } = setup();

      const tenant = await manager.tenants.create("Acme Corp", "user-1");
      const project = await manager.projects.create(tenant.id, "Dashboard");

      await manager.versions.create(project.id, "1.0.0", { a: 1 });
      await manager.versions.create(project.id, "1.1.0", { a: 2 });

      const list = await manager.versions.list(project.id);
      expect(list).toHaveLength(2);
    });
  });
});
