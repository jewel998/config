import type { RequestContext } from "./context";

/**
 * Middleware — Runs FIRST on every request.
 * Use for: rate limiting, logging, request parsing.
 */
export interface Middleware {
  use(ctx: RequestContext): Promise<void> | void;
}
