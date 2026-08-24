import { BadRequestError } from "@jewel998/api";
import { describe, it, expect } from "vitest";

import { ExtractClientIdMiddleware } from "../extract-client-id.middleware";
import { makeCtx, mockReq } from "./helpers";

describe("ExtractClientIdMiddleware", () => {
  const mw = new ExtractClientIdMiddleware();

  it("extracts clientId from query parameter", () => {
    const ctx = makeCtx({ req: mockReq({ query: { clientId: "cid_abc" } }) });
    mw.use(ctx);
    expect(ctx.clientId).toBe("cid_abc");
  });

  it("extracts clientId from request body", () => {
    const ctx = makeCtx({
      req: mockReq({ body: { data: { clientId: "svr_xyz" } } }),
    });
    mw.use(ctx);
    expect(ctx.clientId).toBe("svr_xyz");
  });

  it("prefers query over body", () => {
    const ctx = makeCtx({
      req: mockReq({
        query: { clientId: "cid_query" },
        body: { data: { clientId: "cid_body" } },
      }),
    });
    mw.use(ctx);
    expect(ctx.clientId).toBe("cid_query");
  });

  it("throws BadRequestError when clientId is missing", () => {
    const ctx = makeCtx({ req: mockReq() });
    expect(() => mw.use(ctx)).toThrow(BadRequestError);
  });

  it("sets isServerKey=false for cid_ keys", () => {
    const ctx = makeCtx({ req: mockReq({ query: { clientId: "cid_123" } }) });
    mw.use(ctx);
    expect(ctx.isServerKey).toBe(false);
    expect(ctx.evaluationMode).toBe("server");
  });

  it("sets isServerKey=true for svr_ keys", () => {
    const ctx = makeCtx({ req: mockReq({ query: { clientId: "svr_456" } }) });
    mw.use(ctx);
    expect(ctx.isServerKey).toBe(true);
    expect(ctx.evaluationMode).toBe("client");
  });

  it("extracts origin from Origin header", () => {
    const ctx = makeCtx({
      req: mockReq({
        query: { clientId: "cid_x" },
        headers: { origin: "https://example.com" },
      }),
    });
    mw.use(ctx);
    expect(ctx.origin).toBe("https://example.com");
  });

  it("falls back to referer header", () => {
    const ctx = makeCtx({
      req: mockReq({
        query: { clientId: "cid_x" },
        headers: { referer: "https://other.com/page" },
      }),
    });
    mw.use(ctx);
    expect(ctx.origin).toBe("https://other.com/page");
  });

  it("sets empty origin when no headers present", () => {
    const ctx = makeCtx({ req: mockReq({ query: { clientId: "cid_x" } }) });
    mw.use(ctx);
    expect(ctx.origin).toBe("");
  });
});
