/**
 * Shared test helpers for @jewel998/api.
 */

import type { Req, Res } from "./interfaces/index";

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

export function mockRes(): Res & {
  _status: number;
  _json: unknown;
  _headers: Record<string, string>;
  _ended: boolean;
} {
  const res = {
    _status: 0,
    _json: undefined as unknown,
    _headers: {} as Record<string, string>,
    _ended: false,
    status(code: number) {
      res._status = code;
      return res;
    },
    json(body: unknown) {
      res._json = body;
      return res;
    },
    set(key: string, value: string) {
      res._headers[key] = value;
      return res;
    },
    end() {
      res._ended = true;
      return res;
    },
  };
  return res;
}
