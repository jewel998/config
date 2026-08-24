import type { RequestContext } from "./context";
import type { HandlerResponse } from "./response";

/**
 * Interceptor — Wraps the handler execution (onion model).
 * Has access to BOTH request (before) and response body (after).
 * Use for: response transformation, caching, timing, logging.
 *
 * Call `next()` to proceed — it returns the handler's response body.
 * You can modify it before returning.
 */
export interface Interceptor {
  intercept(ctx: RequestContext, next: () => Promise<HandlerResponse>): Promise<HandlerResponse>;
}
