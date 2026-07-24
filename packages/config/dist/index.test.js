import { describe, expect, it } from "vitest";
import { createConfigClient } from "./index";
describe("createConfigClient", () => {
    it("returns cached values for offline-first keys", async () => {
        const storage = {
            get: async (key) => {
                if (key === "feature.enabled") {
                    return true;
                }
                return undefined;
            },
            set: async () => { },
            delete: async () => { },
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
                getValue: async () => false,
                refresh: async () => { },
            },
        });
        await expect(client.getValue("feature.enabled")).resolves.toBe(true);
    });
    it("refreshes remote values into storage for remote-first keys", async () => {
        const store = new Map();
        const storage = {
            get: async (key) => store.get(key),
            set: async (key, value) => {
                store.set(key, value);
            },
            delete: async (key) => {
                store.delete(key);
            },
        };
        const remoteProvider = {
            getValue: async (_key) => false,
            refresh: async () => { },
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
        await expect(client.getValue("feature.beta")).resolves.toBe(false);
        expect(store.get("feature.beta")).toBe(false);
    });
    it("reads values from the scoped storage key when context is provided", async () => {
        const store = new Map();
        const storage = {
            get: async (key) => store.get(key),
            set: async (key, value) => {
                store.set(key, value);
            },
            delete: async (key) => {
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
        await expect(client.getValue("feature.beta", { projectId: "proj-123" })).resolves.toBe(true);
    });
});
