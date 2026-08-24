import { describe, it, expect, vi } from "vitest";

import { FetchConfigsGuard } from "../fetch-configs.guard";
import { makeCtx } from "./helpers";

vi.mock("../../middleware/fetch-configs", () => ({
  fetchConfigs: vi.fn(),
}));

import { fetchConfigs } from "../../middleware/fetch-configs";
const mockFetch = vi.mocked(fetchConfigs);

describe("FetchConfigsGuard", () => {
  const guard = new FetchConfigsGuard();

  it("sets configs, segments, version, and latestUpdate on context", async () => {
    mockFetch.mockResolvedValue({
      configs: [{ key: "flag.a", value: true, valueType: "boolean" }],
      segments: { seg1: { id: "seg1", name: "Beta", conditions: [] } },
      version: "7",
      latestUpdate: "2025-01-15T09:00:00Z",
    });

    const ctx = makeCtx({
      db: {} as any,
      projectId: "p1",
      environmentId: "e1",
    });
    await guard.canActivate(ctx);

    expect(ctx.configs).toHaveLength(1);
    expect(ctx.configs![0].key).toBe("flag.a");
    expect(ctx.segments!.seg1.name).toBe("Beta");
    expect(ctx.version).toBe("7");
    expect(ctx.latestUpdate).toBe("2025-01-15T09:00:00Z");
  });

  it("passes correct args to fetchConfigs", async () => {
    mockFetch.mockResolvedValue({
      configs: [],
      segments: {},
      version: "0",
      latestUpdate: "",
    });
    const db = { fake: true };

    const ctx = makeCtx({
      db: db as any,
      projectId: "proj_x",
      environmentId: "env_dev",
      requestedKeys: ["flag.a", "flag.b"],
    });
    await guard.canActivate(ctx);

    expect(mockFetch).toHaveBeenCalledWith(db, "proj_x", "env_dev", ["flag.a", "flag.b"]);
  });

  it("passes undefined requestedKeys when not set", async () => {
    mockFetch.mockResolvedValue({
      configs: [],
      segments: {},
      version: "0",
      latestUpdate: "",
    });

    const ctx = makeCtx({ db: {} as any, projectId: "p", environmentId: "e" });
    await guard.canActivate(ctx);

    expect(mockFetch).toHaveBeenCalledWith(expect.anything(), "p", "e", undefined);
  });
});
