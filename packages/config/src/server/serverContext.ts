// ═══════════════════════════════════════════════════════════════
// Server Context Helper
//
// The server-side equivalent of autoContext(). Provides a clean
// way to build evaluation context from server-side data sources
// (HTTP requests, environment variables, session objects, etc.)
// ═══════════════════════════════════════════════════════════════

import type { EvaluationContext } from "../plugins/types.js";

export interface ServerContextOptions {
  /** The authenticated user's ID. Should be stable (database ID, not session). */
  userId?: string;

  /**
   * Custom attributes for targeting rules.
   * Typically derived from the authenticated user, request headers, or environment.
   *
   * @example
   * ```ts
   * serverContext({
   *   userId: req.user.id,
   *   plan: req.user.plan,
   *   country: req.headers["cf-ipcountry"],
   *   locale: req.headers["accept-language"]?.split(",")[0],
   * })
   * ```
   */
  [key: string]: string | number | boolean | string[] | undefined;
}

/**
 * Build an evaluation context from server-side data.
 *
 * Unlike `autoContext()` (browser-side), this does NOT auto-detect anything.
 * In server environments, context comes from your request/session/database
 * — not from `navigator` or `window`.
 *
 * @example
 * ```ts
 * import { initServerConfig, serverContext } from "@jewel998/config/server";
 *
 * // In an Express route handler:
 * app.get("/dashboard", (req, res) => {
 *   const flags = initServerConfig({
 *     clientId: "svr_xxx",
 *     context: serverContext({
 *       userId: req.user.id,
 *       plan: req.user.plan,
 *       country: req.headers["cf-ipcountry"],
 *       role: req.user.role,
 *     }),
 *   });
 *
 *   if (flags.getFlag("feature.new_dashboard")) {
 *     // serve new dashboard
 *   }
 * });
 * ```
 *
 * @example
 * ```ts
 * // For per-request context updates (shared instance):
 * const config = await initServerConfig({ clientId: "svr_xxx" });
 *
 * // On each request:
 * config.setContext(serverContext({
 *   userId: req.user.id,
 *   plan: req.user.plan,
 * }));
 * config.getFlag("feature.checkout_v2");
 * ```
 */
export function serverContext(options?: ServerContextOptions): EvaluationContext {
  if (!options) return {};

  const { userId, ...attrs } = options;
  const attributes: Record<string, string | number | boolean | string[]> = {};

  for (const [k, v] of Object.entries(attrs)) {
    if (v !== undefined) attributes[k] = v;
  }

  return {
    userId,
    attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
  };
}
