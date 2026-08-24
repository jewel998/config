import type { Middleware } from "../interfaces/index";

/**
 * @UseMiddleware(RateLimiter, Logger)
 *
 * Runs FIRST. Before guards, interceptors, pipes, handler.
 */
export function UseMiddleware(...middleware: Middleware[]): ClassDecorator {
  return (target) => {
    (target as unknown as { __middleware: Middleware[] }).__middleware =
      middleware;
  };
}
