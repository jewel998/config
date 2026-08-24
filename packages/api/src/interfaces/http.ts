import type { Request } from "firebase-functions/v2/https";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Res = {
  status(code: number): any;
  json(body: unknown): any;
  set(header: string, value: string): any;
  end(): any;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export type Req = Request;

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
