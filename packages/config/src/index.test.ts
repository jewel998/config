import { describe, expect, it } from "vitest";
import { createConfigClient, createExampleClient } from "./index";
import type { CacheStorage } from "./cache/storage";
import type { RemoteConfigProvider } from "./remote/provider";

describe("createConfigClient", () => {
  it("returns cached values for offline-first keys", async () => {
    const storage: CacheStorage = {
      get: async <T>(key: string) => {
        if (key === "feature.enabled") {
          return true as T;
        }
        return undefined;
      },
      set: async () => {},
      delete: async () => {},
    };

    const client = createConfigClient({
      definitions: [
        {
          key: "feature.enabled",
          defaultValue: false,
          sourceMode: "offline",
          scope: "project",
        },
      ],
      storage,
      remoteProvider: {
        getValue: async <T>() => false as T,
        refresh: async () => {},
      },
    });

    await expect(client.getValue<boolean>("feature.enabled")).resolves.toBe(
      true,
    );
  });

  it("refreshes remote values into storage for remote-first keys", async () => {
    const store = new Map<string, unknown>();
    const storage: CacheStorage = {
      get: async <T>(key: string) => store.get(key) as T | undefined,
      set: async <T>(key: string, value: T) => {
        store.set(key, value);
      },
      delete: async (key: string) => {
        store.delete(key);
      },
    };

    const remoteProvider: RemoteConfigProvider = {
      getValue: async <T>(_key: string) => false as T,
      refresh: async () => {},
    };

    const client = createConfigClient({
      definitions: [
        {
          key: "feature.beta",
          defaultValue: false,
          sourceMode: "remote",
          scope: "project",
        },
      ],
      storage,
      remoteProvider,
    });

    await client.refresh();

    await expect(client.getValue<boolean>("feature.beta")).resolves.toBe(false);
    expect(store.get("feature.beta")).toBe(false);
  });

  it("reads values from the scoped storage key when context is provided", async () => {
    const store = new Map<string, unknown>();
    const storage: CacheStorage = {
      get: async <T>(key: string) => store.get(key) as T | undefined,
      set: async <T>(key: string, value: T) => {
        store.set(key, value);
      },
      delete: async (key: string) => {
        store.delete(key);
      },
    };

    const client = createConfigClient({
      definitions: [
        {
          key: "feature.beta",
          defaultValue: false,
          sourceMode: "offline",
          scope: "project",
        },
      ],
      storage,
    });

    await storage.set("feature.beta:proj-123", true);

    await expect(
      client.getValue<boolean>("feature.beta", { projectId: "proj-123" }),
    ).resolves.toBe(true);
  });

  it("exposes the example client factory from the package entrypoint", async () => {
    const client = createExampleClient();

    await expect(client.getValue<boolean>("feature.beta")).resolves.toBe(true);
  });
});
