import type { Guard, RequestContext } from "@jewel998/api";
import { PayloadTooLargeError } from "@jewel998/api";
import { MAX_CONTEXT_SIZE_BYTES } from "../../utils/constants";
import type { UserContext } from "../server-evaluator";

/**
 * Extracts user context and key filter from the request body.
 * - userContext: only for client keys (server-side evaluation)
 * - requestedKeys: optional key filter (both key types)
 *
 * Only used by getConfig — getVersion doesn't need context or keys.
 */
export class ExtractContextGuard implements Guard {
  canActivate(ctx: RequestContext): void {
    const { req } = ctx;

    if (ctx.evaluationMode === "server") {
      const userContext = (req.body?.data?.context as UserContext) ?? undefined;
      if (userContext) {
        if (JSON.stringify(userContext).length > MAX_CONTEXT_SIZE_BYTES) {
          throw new PayloadTooLargeError("Context payload exceeds 10KB limit");
        }
        ctx.userContext = userContext;
      }
    }

    const keysFromQuery = (req.query.keys as string)
      ?.split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    ctx.requestedKeys =
      keysFromQuery ??
      (req.body?.data?.keys as string[] | undefined) ??
      undefined;
  }
}
