import type { Guard, RequestContext } from "@jewel998/api";
import { MethodNotAllowedError } from "@jewel998/api";

/**
 * Validates that the HTTP method matches the key type.
 * - cid_ (client) → POST only (needs body with context)
 * - svr_ (server) → GET only (fetches full data, no body needed)
 *
 * Only used by getConfig — getVersion accepts both methods for any key.
 */
export class ValidateKeyMethodGuard implements Guard {
  canActivate(ctx: RequestContext): void {
    const { req } = ctx;

    if (!ctx.isServerKey && req.method === "GET") {
      throw new MethodNotAllowedError(
        "Client keys (cid_) require POST. GET is not supported because " +
          "server-side evaluation needs a request body with context.",
      );
    }

    if (ctx.isServerKey && req.method === "POST") {
      throw new MethodNotAllowedError(
        "Server keys (svr_) require GET. POST is not supported because " +
          "server keys return full flag data for local SDK evaluation.",
      );
    }
  }
}
