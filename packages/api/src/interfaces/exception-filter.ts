import type { RequestContext } from "./context";
import type { HandlerResponse } from "./response";

/**
 * ExceptionFilter — Catches errors from any layer.
 * Return a response body to handle it, or undefined to pass
 * to the next filter / default handler.
 *
 * Note: Use ctx.res.status() to set the error status code.
 */
export interface ExceptionFilter {
  catch(error: unknown, ctx: RequestContext): HandlerResponse | undefined;
}
