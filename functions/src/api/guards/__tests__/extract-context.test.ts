import { describe, it, expect } from "vitest";
import { PayloadTooLargeError } from "@jewel998/api";
import { ExtractContextGuard } from "../extract-context.guard";
import { makeCtx, mockReq } from "./helpers";

describe("ExtractContextGuard", () => {
  const guard = new ExtractContextGuard();

  describe("user context extraction", () => {
    it("extracts userContext for client keys (evaluationMode=server)", () => {
      const ctx = makeCtx({
        req: mockReq({
          body: {
            data: { context: { userId: "u1", attributes: { plan: "pro" } } },
          },
        }),
        evaluationMode: "server",
      });
      guard.canActivate(ctx);
      expect(ctx.userContext).toEqual({
        userId: "u1",
        attributes: { plan: "pro" },
      });
    });

    it("does not extract userContext for server keys (evaluationMode=client)", () => {
      const ctx = makeCtx({
        req: mockReq({ body: { data: { context: { userId: "u1" } } } }),
        evaluationMode: "client",
      });
      guard.canActivate(ctx);
      expect(ctx.userContext).toBeUndefined();
    });

    it("throws PayloadTooLargeError when context exceeds 10KB", () => {
      const largeContext = {
        userId: "u1",
        attributes: { data: "x".repeat(11000) },
      };
      const ctx = makeCtx({
        req: mockReq({ body: { data: { context: largeContext } } }),
        evaluationMode: "server",
      });
      expect(() => guard.canActivate(ctx)).toThrow(PayloadTooLargeError);
    });

    it("allows context just under 10KB", () => {
      const smallContext = {
        userId: "u1",
        attributes: { data: "x".repeat(5000) },
      };
      const ctx = makeCtx({
        req: mockReq({ body: { data: { context: smallContext } } }),
        evaluationMode: "server",
      });
      expect(() => guard.canActivate(ctx)).not.toThrow();
    });
  });

  describe("key filter extraction", () => {
    it("extracts keys from query string", () => {
      const ctx = makeCtx({
        req: mockReq({ query: { keys: "flag.a,flag.b,flag.c" } }),
        evaluationMode: "client",
      });
      guard.canActivate(ctx);
      expect(ctx.requestedKeys).toEqual(["flag.a", "flag.b", "flag.c"]);
    });

    it("trims whitespace from keys", () => {
      const ctx = makeCtx({
        req: mockReq({ query: { keys: " flag.a , flag.b " } }),
        evaluationMode: "client",
      });
      guard.canActivate(ctx);
      expect(ctx.requestedKeys).toEqual(["flag.a", "flag.b"]);
    });

    it("extracts keys from body", () => {
      const ctx = makeCtx({
        req: mockReq({ body: { data: { keys: ["flag.x", "flag.y"] } } }),
        evaluationMode: "client",
      });
      guard.canActivate(ctx);
      expect(ctx.requestedKeys).toEqual(["flag.x", "flag.y"]);
    });

    it("sets undefined when no keys provided", () => {
      const ctx = makeCtx({ req: mockReq(), evaluationMode: "client" });
      guard.canActivate(ctx);
      expect(ctx.requestedKeys).toBeUndefined();
    });
  });
});
