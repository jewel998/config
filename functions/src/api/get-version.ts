// ═══════════════════════════════════════════════════════════════
// getVersion — Lightweight Version Check API
//
// GET  /api/v1/version?clientId=cid_xxx
// POST /api/v1/version  { data: { clientId: "cid_xxx" } }
// ═══════════════════════════════════════════════════════════════

import { onRequest } from "firebase-functions/v2/https";
import {
  Methods,
  UseMiddleware,
  UseGuards,
  RequestHandler,
  createHandler,
} from "@jewel998/api";
import type { RequestContext, HandlerResponse } from "@jewel998/api";
import { MAX_INSTANCES, MIN_INSTANCES, API_REGION } from "../utils/constants";
import { getDb } from "../utils/firestore";
import {
  ExtractClientIdMiddleware,
  RateLimitMiddleware,
  AuthenticateGuard,
} from "./guards/index";

// ── Handler ──────────────────────────────────────────────────

@Methods("GET", "POST")
@UseMiddleware(new ExtractClientIdMiddleware(), new RateLimitMiddleware())
@UseGuards(new AuthenticateGuard())
class GetVersionHandler extends RequestHandler {
  async handle(ctx: RequestContext): Promise<HandlerResponse | void> {
    const envDoc = await ctx.db
      .collection("projects")
      .doc(ctx.projectId!)
      .collection("environments")
      .doc(ctx.environmentId!)
      .get();

    const envData = envDoc.data() ?? {};
    const version = envData.configVersion ?? "0";
    const changedKeys: string[] = envData.lastChangedKeys ?? [];

    ctx.res.set("Cache-Control", "public, max-age=10, s-maxage=15");
    ctx.res.set("ETag", `"${version}"`);

    if (ctx.req.headers["if-none-match"] === `"${version}"`) {
      ctx.res.status(304).end();
      return;
    }

    return { data: { version, changedKeys } };
  }
}

// ── Export ────────────────────────────────────────────────────

export const getVersion = onRequest(
  {
    cors: true,
    maxInstances: MAX_INSTANCES,
    minInstances: MIN_INSTANCES,
    region: API_REGION,
    memory: "256MiB",
  },
  createHandler(GetVersionHandler, {
    createContext: (req, res) => ({ req, res, db: getDb() }),
  }),
);
