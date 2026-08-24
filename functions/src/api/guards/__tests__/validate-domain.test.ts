import { ForbiddenError } from "@jewel998/api";
import { describe, it, expect, vi } from "vitest";

import { ValidateDomainGuard } from "../validate-domain.guard";
import { makeCtx } from "./helpers";

// Mock the validateDomain function
vi.mock("../../middleware/validate-domain", () => ({
  validateDomain: vi.fn(),
}));

import { validateDomain } from "../../middleware/validate-domain";
const mockValidateDomain = vi.mocked(validateDomain);

describe("ValidateDomainGuard", () => {
  const guard = new ValidateDomainGuard();

  it("skips validation for server keys", async () => {
    const ctx = makeCtx({
      isServerKey: true,
      db: {} as any,
      projectId: "proj1",
      environmentId: "env1",
      origin: "https://evil.com",
    });

    await guard.canActivate(ctx);
    expect(mockValidateDomain).not.toHaveBeenCalled();
  });

  it("calls validateDomain for client keys", async () => {
    mockValidateDomain.mockResolvedValue(undefined);
    const ctx = makeCtx({
      isServerKey: false,
      db: {} as any,
      projectId: "proj1",
      environmentId: "env1",
      origin: "https://allowed.com",
    });

    await guard.canActivate(ctx);
    expect(mockValidateDomain).toHaveBeenCalledWith(ctx.db, "proj1", "env1", "https://allowed.com");
  });

  it("propagates error from validateDomain", async () => {
    mockValidateDomain.mockRejectedValue(new ForbiddenError("Origin blocked"));

    const ctx = makeCtx({
      isServerKey: false,
      db: {} as any,
      projectId: "proj1",
      environmentId: "env1",
      origin: "https://evil.com",
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow("Origin blocked");
  });
});
