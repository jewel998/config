import { UnauthorizedError } from "@jewel998/api";
import { describe, it, expect, vi } from "vitest";

import { AuthenticateGuard } from "../authenticate.guard";
import { makeCtx } from "./helpers";

vi.mock("../../middleware/authenticate", () => ({
  authenticateClient: vi.fn(),
}));

import { authenticateClient } from "../../middleware/authenticate";
const mockAuth = vi.mocked(authenticateClient);

describe("AuthenticateGuard", () => {
  const guard = new AuthenticateGuard();

  it("sets projectId and environmentId on context", async () => {
    mockAuth.mockResolvedValue({
      projectId: "proj_abc",
      environmentId: "env_prod",
    });

    const ctx = makeCtx({ clientId: "cid_123", db: {} as any });
    await guard.canActivate(ctx);

    expect(ctx.projectId).toBe("proj_abc");
    expect(ctx.environmentId).toBe("env_prod");
  });

  it("passes db and clientId to authenticateClient", async () => {
    mockAuth.mockResolvedValue({ projectId: "p", environmentId: "e" });
    const db = { fake: true };

    const ctx = makeCtx({ clientId: "svr_xyz", db: db as any });
    await guard.canActivate(ctx);

    expect(mockAuth).toHaveBeenCalledWith(db, "svr_xyz");
  });

  it("propagates UnauthorizedError from authenticateClient", async () => {
    mockAuth.mockRejectedValue(new UnauthorizedError("Invalid key"));

    const ctx = makeCtx({ clientId: "cid_bad", db: {} as any });
    await expect(guard.canActivate(ctx)).rejects.toThrow("Invalid key");
  });
});
