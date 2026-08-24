import type { RequestContext } from "./context";

/**
 * Guard — Runs AFTER middleware.
 * Use for: authentication, authorization, context enrichment.
 * Return false or throw to reject.
 */
export interface Guard {
  canActivate(ctx: RequestContext): Promise<boolean | void> | boolean | void;
}
