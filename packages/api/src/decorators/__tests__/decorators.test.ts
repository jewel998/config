import { describe, it, expect } from "vitest";

import type { Middleware, Guard, Interceptor, Pipe, ExceptionFilter } from "../../interfaces/index";
import { Methods } from "../methods";
import { Status } from "../status";
import { UseFilters } from "../use-filters";
import { UseGuards } from "../use-guards";
import { UseInterceptors } from "../use-interceptors";
import { UseMiddleware } from "../use-middleware";
import { UsePipes } from "../use-pipes";

describe("@Methods", () => {
  it("attaches __methods to the class", () => {
    @Methods("GET", "POST")
    class Test {}

    expect((Test as unknown as { __methods: string[] }).__methods).toEqual(["GET", "POST"]);
  });

  it("works with single method", () => {
    @Methods("DELETE")
    class Test {}

    expect((Test as unknown as { __methods: string[] }).__methods).toEqual(["DELETE"]);
  });
});

describe("@Status", () => {
  it("attaches __status to the class", () => {
    @Status(201)
    class Test {}

    expect((Test as unknown as { __status: number }).__status).toBe(201);
  });
});

describe("@UseMiddleware", () => {
  it("attaches __middleware to the class", () => {
    const mw: Middleware = { use: () => {} };

    @UseMiddleware(mw)
    class Test {}

    expect((Test as unknown as { __middleware: Middleware[] }).__middleware).toEqual([mw]);
  });

  it("preserves order", () => {
    const mw1: Middleware = { use: () => {} };
    const mw2: Middleware = { use: () => {} };

    @UseMiddleware(mw1, mw2)
    class Test {}

    const stored = (Test as unknown as { __middleware: Middleware[] }).__middleware;
    expect(stored[0]).toBe(mw1);
    expect(stored[1]).toBe(mw2);
  });
});

describe("@UseGuards", () => {
  it("attaches __guards to the class", () => {
    const g: Guard = { canActivate: () => {} };

    @UseGuards(g)
    class Test {}

    expect((Test as unknown as { __guards: Guard[] }).__guards).toEqual([g]);
  });
});

describe("@UseInterceptors", () => {
  it("attaches __interceptors to the class", () => {
    const i: Interceptor = { intercept: async (_ctx, next) => next() };

    @UseInterceptors(i)
    class Test {}

    expect((Test as unknown as { __interceptors: Interceptor[] }).__interceptors).toEqual([i]);
  });
});

describe("@UsePipes", () => {
  it("attaches __pipes to the class", () => {
    const p: Pipe = { transform: () => {} };

    @UsePipes(p)
    class Test {}

    expect((Test as unknown as { __pipes: Pipe[] }).__pipes).toEqual([p]);
  });
});

describe("@UseFilters", () => {
  it("attaches __filters to the class", () => {
    const f: ExceptionFilter = { catch: () => undefined };

    @UseFilters(f)
    class Test {}

    expect((Test as unknown as { __filters: ExceptionFilter[] }).__filters).toEqual([f]);
  });
});
