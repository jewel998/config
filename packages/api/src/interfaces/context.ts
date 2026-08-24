import type { Req, Res } from "./http";

/**
 * Mutable request context that flows through the pipeline.
 * Includes both `req` and `res` so any layer (guards, middleware,
 * interceptors, handler) can set headers or read request data.
 *
 * Consumers augment this via module declaration merging:
 *
 * ```ts
 * declare module "@jewel998/api" {
 *   interface RequestContext {
 *     db: Firestore;
 *     projectId: string;
 *   }
 * }
 * ```
 */
export interface RequestContext {
  req: Req;
  res: Res;
  [key: string]: unknown;
}
