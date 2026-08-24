import type { RequestContext } from "./context";

/**
 * Pipe — Runs AFTER interceptors (pre), BEFORE handler.
 * Use for: validation, transformation of request data.
 * Throws BadRequestError on validation failure.
 */
export interface Pipe {
  transform(ctx: RequestContext): Promise<void> | void;
}
