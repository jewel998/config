import { describe, expect, it } from "vitest";

import { createConfigManager } from "./manager";
import { createMemoryBackend } from "./memory-backend";

describe("createConfigManager", () => {
  const setup = () => {
    const backend = createMemoryBackend();
    const manager = createConfigManager({ backend });
    return { manager };
  };

  describe("projects", () => {
    it("creates and lists projects", async () => {
      const { manager } = setup();

      const project = await manager.projects.create("Dashboard", "user-1");

      expect(project.name).toBe("Dashboard");
      expect(project.ownerId).toBe("user-1");
      expect(project.id).toBeDefined();

      const list = await manager.projects.list("user-1");
      expect(list).toHaveLength(1);
      expect(list[0]?.id).toBe(project.id);
    });

    it("deletes a project", async () => {
      const { manager } = setup();

      const project = await manager.projects.create("Dashboard", "user-1");
      await manager.projects.delete(project.id);

      const list = await manager.projects.list("user-1");
      expect(list).toHaveLength(0);
    });
  });

  describe("environments", () => {
    it("creates and lists environments within a project", async () => {
      const { manager } = setup();

      const project = await manager.projects.create("Dashboard", "user-1");
      const env = await manager.environments.create(project.id, "staging");

      expect(env.name).toBe("staging");
      expect(env.projectId).toBe(project.id);

      const list = await manager.environments.list(project.id);
      expect(list).toHaveLength(1);
    });

    it("deletes an environment", async () => {
      const { manager } = setup();

      const project = await manager.projects.create("Dashboard", "user-1");
      const env = await manager.environments.create(project.id, "staging");
      await manager.environments.delete(project.id, env.id);

      const list = await manager.environments.list(project.id);
      expect(list).toHaveLength(0);
    });
  });

  describe("versions", () => {
    it("creates a draft version", async () => {
      const { manager } = setup();

      const project = await manager.projects.create("Dashboard", "user-1");

      const version = await manager.versions.create(project.id, "1.0.0", {
        "feature.beta": true,
      });

      expect(version.version).toBe("1.0.0");
      expect(version.publishedAt).toBeUndefined();
      expect(version.payload).toEqual({ "feature.beta": true });
    });

    it("publishes a version", async () => {
      const { manager } = setup();

      const project = await manager.projects.create("Dashboard", "user-1");
      const version = await manager.versions.create(project.id, "1.0.0", {
        "feature.beta": true,
      });

      const published = await manager.versions.publish(project.id, version.id);

      expect(published.publishedAt).toBeDefined();
    });

    it("rejects publishing an already-published version", async () => {
      const { manager } = setup();

      const project = await manager.projects.create("Dashboard", "user-1");
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

      const project = await manager.projects.create("Dashboard", "user-1");

      await manager.versions.create(project.id, "1.0.0", { a: 1 });
      await manager.versions.create(project.id, "1.1.0", { a: 2 });

      const list = await manager.versions.list(project.id);
      expect(list).toHaveLength(2);
    });
  });
});
