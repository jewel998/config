import { describe, it, expect, vi } from "vitest";
import { mockReq, mockRes } from "../../test-utils";
import { createHandler } from "../create-handler";
import { RequestHandler } from "../request-handler";
import {
  Methods,
  Status,
  UseMiddleware,
  UseGuards,
  UseInterceptors,
  UsePipes,
  UseFilters,
} from "../../decorators/index";
import {
  BadRequestError,
  ForbiddenError,
  TooManyRequestsError,
} from "../../errors/index";
import type {
  RequestContext,
  Middleware,
  Guard,
  Interceptor,
  Pipe,
  ExceptionFilter,
} from "../../interfaces/index";

// ═══════════════════════════════════════════════════════════════
// Response serialization
// ═══════════════════════════════════════════════════════════════

describe("response serialization", () => {
  it("serializes returned body as JSON with status 200", async () => {
    class H extends RequestHandler {
      handle() {
        return { ok: true };
      }
    }
    const res = mockRes();
    await createHandler(H)(mockReq(), res);
    expect(res._status).toBe(200);
    expect(res._json).toEqual({ ok: true });
  });

  it("returns 204 when handler returns void", async () => {
    class H extends RequestHandler {
      handle() {}
    }
    const res = mockRes();
    await createHandler(H)(mockReq(), res);
    expect(res._status).toBe(204);
    expect(res._ended).toBe(true);
  });

  it("returns 204 when handler returns null", async () => {
    class H extends RequestHandler {
      handle() {
        return null;
      }
    }
    const res = mockRes();
    await createHandler(H)(mockReq(), res);
    expect(res._status).toBe(204);
  });

  it("returns 204 when handler returns undefined", async () => {
    class H extends RequestHandler {
      handle() {
        return undefined;
      }
    }
    const res = mockRes();
    await createHandler(H)(mockReq(), res);
    expect(res._status).toBe(204);
  });

  it("uses @Status decorator for success code", async () => {
    @Status(201)
    class H extends RequestHandler {
      handle() {
        return { id: "x" };
      }
    }
    const res = mockRes();
    await createHandler(H)(mockReq(), res);
    expect(res._status).toBe(201);
  });

  it("pipeline can override status via ctx.res.status()", async () => {
    class H extends RequestHandler {
      handle(ctx: RequestContext) {
        ctx.res.status(202);
        return { accepted: true };
      }
    }
    const res = mockRes();
    await createHandler(H)(mockReq(), res);
    expect(res._status).toBe(202);
    expect(res._json).toEqual({ accepted: true });
  });
});

// ═══════════════════════════════════════════════════════════════
// @Methods
// ═══════════════════════════════════════════════════════════════

describe("@Methods validation", () => {
  @Methods("POST")
  class PostOnly extends RequestHandler {
    handle() {
      return "ok";
    }
  }

  it("allows matching method", async () => {
    const res = mockRes();
    await createHandler(PostOnly)(mockReq({ method: "POST" }), res);
    expect(res._status).toBe(200);
  });

  it("rejects with 405 for wrong method", async () => {
    const res = mockRes();
    await createHandler(PostOnly)(mockReq({ method: "GET" }), res);
    expect(res._status).toBe(405);
  });

  it("handles multiple allowed methods", async () => {
    @Methods("GET", "POST")
    class Multi extends RequestHandler {
      handle() {
        return "ok";
      }
    }

    const res1 = mockRes();
    await createHandler(Multi)(mockReq({ method: "GET" }), res1);
    expect(res1._status).toBe(200);

    const res2 = mockRes();
    await createHandler(Multi)(mockReq({ method: "DELETE" }), res2);
    expect(res2._status).toBe(405);
  });
});

// ═══════════════════════════════════════════════════════════════
// @UseMiddleware
// ═══════════════════════════════════════════════════════════════

describe("@UseMiddleware", () => {
  it("runs middleware in order before guards/handler", async () => {
    const order: string[] = [];
    const mw1: Middleware = {
      use: () => {
        order.push("mw1");
      },
    };
    const mw2: Middleware = {
      use: () => {
        order.push("mw2");
      },
    };

    @UseMiddleware(mw1, mw2)
    class H extends RequestHandler {
      handle() {
        order.push("handler");
        return "done";
      }
    }

    await createHandler(H)(mockReq(), mockRes());
    expect(order).toEqual(["mw1", "mw2", "handler"]);
  });

  it("short-circuits on throw", async () => {
    const mw: Middleware = {
      use: () => {
        throw new TooManyRequestsError("nope", 60);
      },
    };
    @UseMiddleware(mw)
    class H extends RequestHandler {
      handle() {
        return "unreachable";
      }
    }

    const res = mockRes();
    await createHandler(H)(mockReq(), res);
    expect(res._status).toBe(429);
    expect(res._headers["Retry-After"]).toBe("60");
  });
});

// ═══════════════════════════════════════════════════════════════
// @UseGuards
// ═══════════════════════════════════════════════════════════════

describe("@UseGuards", () => {
  it("enriches context", async () => {
    const g: Guard = {
      canActivate: (ctx) => {
        ctx.userId = "u1";
      },
    };
    @UseGuards(g)
    class H extends RequestHandler {
      handle(ctx: RequestContext) {
        return { userId: ctx.userId };
      }
    }

    const res = mockRes();
    await createHandler(H)(mockReq(), res);
    expect(res._json).toEqual({ userId: "u1" });
  });

  it("returns 403 when guard returns false", async () => {
    const g: Guard = { canActivate: () => false };
    @UseGuards(g)
    class H extends RequestHandler {
      handle() {
        return "unreachable";
      }
    }

    const res = mockRes();
    await createHandler(H)(mockReq(), res);
    expect(res._status).toBe(403);
  });

  it("propagates guard's thrown error", async () => {
    const g: Guard = {
      canActivate: () => {
        throw new ForbiddenError("no");
      },
    };
    @UseGuards(g)
    class H extends RequestHandler {
      handle() {
        return "unreachable";
      }
    }

    const res = mockRes();
    await createHandler(H)(mockReq(), res);
    expect(res._status).toBe(403);
    expect((res._json as { error: { message: string } }).error.message).toBe(
      "no",
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// @UseInterceptors
// ═══════════════════════════════════════════════════════════════

describe("@UseInterceptors", () => {
  it("wraps handler with pre/post access", async () => {
    const order: string[] = [];
    const i: Interceptor = {
      intercept: async (ctx, next) => {
        order.push("pre");
        ctx.res.set("X-Pre", "yes");
        const body = await next();
        order.push("post");
        return body;
      },
    };

    @UseInterceptors(i)
    class H extends RequestHandler {
      handle() {
        order.push("handler");
        return { v: 1 };
      }
    }

    const res = mockRes();
    await createHandler(H)(mockReq(), res);
    expect(order).toEqual(["pre", "handler", "post"]);
    expect(res._headers["X-Pre"]).toBe("yes");
  });

  it("nests in onion order", async () => {
    const order: string[] = [];
    const outer: Interceptor = {
      intercept: async (_c, next) => {
        order.push("o-pre");
        const r = await next();
        order.push("o-post");
        return r;
      },
    };
    const inner: Interceptor = {
      intercept: async (_c, next) => {
        order.push("i-pre");
        const r = await next();
        order.push("i-post");
        return r;
      },
    };

    @UseInterceptors(outer, inner)
    class H extends RequestHandler {
      handle() {
        order.push("handler");
        return "x";
      }
    }

    await createHandler(H)(mockReq(), mockRes());
    expect(order).toEqual(["o-pre", "i-pre", "handler", "i-post", "o-post"]);
  });

  it("can transform the response body", async () => {
    const i: Interceptor = {
      intercept: async (_ctx, next) => {
        const body = (await next()) as { count: number };
        return { ...body, doubled: body.count * 2 };
      },
    };

    @UseInterceptors(i)
    class H extends RequestHandler {
      handle() {
        return { count: 5 };
      }
    }

    const res = mockRes();
    await createHandler(H)(mockReq(), res);
    expect(res._json).toEqual({ count: 5, doubled: 10 });
  });
});

// ═══════════════════════════════════════════════════════════════
// @UsePipes
// ═══════════════════════════════════════════════════════════════

describe("@UsePipes", () => {
  it("runs before handler", async () => {
    const p: Pipe = {
      transform: (ctx) => {
        ctx.validated = true;
      },
    };
    @UsePipes(p)
    class H extends RequestHandler {
      handle(ctx: RequestContext) {
        return { validated: ctx.validated };
      }
    }

    const res = mockRes();
    await createHandler(H)(mockReq(), res);
    expect(res._json).toEqual({ validated: true });
  });

  it("rejects with thrown error", async () => {
    const p: Pipe = {
      transform: () => {
        throw new BadRequestError("invalid");
      },
    };
    @UsePipes(p)
    class H extends RequestHandler {
      handle() {
        return "unreachable";
      }
    }

    const res = mockRes();
    await createHandler(H)(mockReq(), res);
    expect(res._status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════
// @UseFilters
// ═══════════════════════════════════════════════════════════════

describe("@UseFilters", () => {
  it("catches and transforms errors", async () => {
    const f: ExceptionFilter = {
      catch: (err, ctx) => {
        if (err instanceof Error && err.message === "biz") {
          ctx.res.status(422);
          return { error: "handled" };
        }
        return undefined;
      },
    };

    @UseFilters(f)
    class H extends RequestHandler {
      handle() {
        throw new Error("biz");
      }
    }

    const res = mockRes();
    await createHandler(H)(mockReq(), res);
    expect(res._status).toBe(422);
    expect(res._json).toEqual({ error: "handled" });
  });

  it("passes to default handler if filter returns undefined", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const f: ExceptionFilter = { catch: () => undefined };

    @UseFilters(f)
    class H extends RequestHandler {
      handle() {
        throw new Error("oops");
      }
    }

    const res = mockRes();
    await createHandler(H)(mockReq(), res);
    expect(res._status).toBe(500);
    consoleSpy.mockRestore();
  });

  it("first filter handles → second never called", async () => {
    const calls: string[] = [];
    const f1: ExceptionFilter = {
      catch: (_e, ctx) => {
        calls.push("f1");
        ctx.res.status(400);
        return { handled: "f1" };
      },
    };
    const f2: ExceptionFilter = {
      catch: () => {
        calls.push("f2");
        return { handled: "f2" };
      },
    };

    @UseFilters(f1, f2)
    class H extends RequestHandler {
      handle() {
        throw new Error("x");
      }
    }

    const res = mockRes();
    await createHandler(H)(mockReq(), res);
    expect(calls).toEqual(["f1"]);
    expect(res._status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════
// Default exception handler
// ═══════════════════════════════════════════════════════════════

describe("default exception handler", () => {
  it("formats ApiError into JSON response", async () => {
    class H extends RequestHandler {
      handle() {
        throw new ForbiddenError("nope");
      }
    }

    const res = mockRes();
    await createHandler(H)(mockReq(), res);
    expect(res._status).toBe(403);
    expect(res._json).toEqual({
      error: { code: "FORBIDDEN", message: "nope" },
    });
  });

  it("sets Retry-After for TooManyRequestsError", async () => {
    class H extends RequestHandler {
      handle() {
        throw new TooManyRequestsError("slow", 45);
      }
    }

    const res = mockRes();
    await createHandler(H)(mockReq(), res);
    expect(res._status).toBe(429);
    expect(res._headers["Retry-After"]).toBe("45");
  });

  it("returns 500 for unknown errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    class H extends RequestHandler {
      handle() {
        throw new TypeError("wat");
      }
    }

    const res = mockRes();
    await createHandler(H)(mockReq(), res);
    expect(res._status).toBe(500);
    expect((res._json as { error: { code: string } }).error.code).toBe(
      "INTERNAL_ERROR",
    );
    consoleSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════
// createContext option
// ═══════════════════════════════════════════════════════════════

describe("createContext option", () => {
  it("injects custom fields into context", async () => {
    class H extends RequestHandler {
      handle(ctx: RequestContext) {
        return { db: ctx.db };
      }
    }

    const res = mockRes();
    await createHandler(H, {
      createContext: (req, r) => ({ req, res: r, db: "firestore" }),
    })(mockReq(), res);
    expect(res._json).toEqual({ db: "firestore" });
  });
});

// ═══════════════════════════════════════════════════════════════
// Full pipeline order
// ═══════════════════════════════════════════════════════════════

describe("full pipeline execution order", () => {
  it("middleware → guard → interceptor(pre) → pipe → handler → interceptor(post)", async () => {
    const order: string[] = [];

    const mw: Middleware = {
      use: () => {
        order.push("mw");
      },
    };
    const g: Guard = {
      canActivate: () => {
        order.push("guard");
      },
    };
    const i: Interceptor = {
      intercept: async (_c, next) => {
        order.push("i-pre");
        const r = await next();
        order.push("i-post");
        return r;
      },
    };
    const p: Pipe = {
      transform: () => {
        order.push("pipe");
      },
    };

    @Methods("GET")
    @UseMiddleware(mw)
    @UseGuards(g)
    @UseInterceptors(i)
    @UsePipes(p)
    class H extends RequestHandler {
      handle() {
        order.push("handler");
        return "done";
      }
    }

    const res = mockRes();
    await createHandler(H)(mockReq(), res);
    expect(res._status).toBe(200);
    expect(order).toEqual([
      "mw",
      "guard",
      "i-pre",
      "pipe",
      "handler",
      "i-post",
    ]);
  });
});
