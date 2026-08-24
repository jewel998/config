import type { RequestContext, Req, Res } from "@jewel998/api";

export function mockReq(overrides: Partial<Req> = {}): Req {
  return {
    method: "GET",
    url: "/api/v1/config",
    headers: {},
    query: {},
    body: {},
    ...overrides,
  } as unknown as Req;
}

export function mockRes(): Res {
  const res = {
    _status: 0,
    status(code: number) {
      res._status = code;
      return res;
    },
    json(body: unknown) {
      return res;
    },
    set(key: string, value: string) {
      return res;
    },
    end() {
      return res;
    },
  };
  return res as unknown as Res;
}

export function makeCtx(
  overrides: Partial<RequestContext> = {},
): RequestContext {
  return {
    req: mockReq(),
    res: mockRes(),
    ...overrides,
  } as RequestContext;
}
