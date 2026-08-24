import { describe, it, expect } from "vitest";
import { MethodNotAllowedError } from "@jewel998/api";
import { ValidateKeyMethodGuard } from "../validate-key-method.guard";
import { makeCtx, mockReq } from "./helpers";

describe("ValidateKeyMethodGuard", () => {
  const guard = new ValidateKeyMethodGuard();

  it("allows POST for client keys (cid_)", () => {
    const ctx = makeCtx({
      req: mockReq({ method: "POST" }),
      isServerKey: false,
    });
    expect(() => guard.canActivate(ctx)).not.toThrow();
  });

  it("rejects GET for client keys (cid_)", () => {
    const ctx = makeCtx({
      req: mockReq({ method: "GET" }),
      isServerKey: false,
    });
    expect(() => guard.canActivate(ctx)).toThrow(MethodNotAllowedError);
  });

  it("allows GET for server keys (svr_)", () => {
    const ctx = makeCtx({ req: mockReq({ method: "GET" }), isServerKey: true });
    expect(() => guard.canActivate(ctx)).not.toThrow();
  });

  it("rejects POST for server keys (svr_)", () => {
    const ctx = makeCtx({
      req: mockReq({ method: "POST" }),
      isServerKey: true,
    });
    expect(() => guard.canActivate(ctx)).toThrow(MethodNotAllowedError);
  });

  it("error message mentions cid_ requirement for client keys", () => {
    const ctx = makeCtx({
      req: mockReq({ method: "GET" }),
      isServerKey: false,
    });
    try {
      guard.canActivate(ctx);
    } catch (e) {
      expect((e as MethodNotAllowedError).message).toContain(
        "Client keys (cid_) require POST",
      );
    }
  });

  it("error message mentions svr_ requirement for server keys", () => {
    const ctx = makeCtx({
      req: mockReq({ method: "POST" }),
      isServerKey: true,
    });
    try {
      guard.canActivate(ctx);
    } catch (e) {
      expect((e as MethodNotAllowedError).message).toContain(
        "Server keys (svr_) require GET",
      );
    }
  });
});
