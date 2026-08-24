import type { Middleware, RequestContext } from "@jewel998/api";
import { BadRequestError } from "@jewel998/api";

/**
 * Extracts and validates the clientId from query or body.
 * Sets: ctx.clientId, ctx.isServerKey, ctx.evaluationMode, ctx.origin
 *
 * This is middleware (not a guard) because it's request parsing —
 * not authorization. It runs before guards in the pipeline.
 */
export class ExtractClientIdMiddleware implements Middleware {
  use(ctx: RequestContext): void {
    const { req } = ctx;

    const clientId = (req.query.clientId as string) ?? (req.body?.data?.clientId as string) ?? null;

    if (!clientId) throw new BadRequestError("clientId is required");

    ctx.clientId = clientId;
    ctx.isServerKey = clientId.startsWith("svr_");
    ctx.evaluationMode = ctx.isServerKey ? "client" : "server";
    ctx.origin = (req.headers.origin ?? req.headers.referer ?? "") as string;
  }
}
