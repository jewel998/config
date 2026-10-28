// ═══════════════════════════════════════════════════════════════
// getVersion — Lightweight Version Check API
//
// GET  /api/v1/version?clientId=cid_xxx
// POST /api/v1/version  { data: { clientId: "cid_xxx" } }
// ═══════════════════════════════════════════════════════════════

import { Methods, UseMiddleware, UseGuards, RequestHandler, createHandler } from "@jewel998/api";
import type { RequestContext, HandlerResponse } from "@jewel998/api";
import { onRequest } from "firebase-functions/v2/https";

import {
  MAX_INSTANCES,
  MIN_INSTANCES,
  API_REGION,
  VERSION_CACHE_SECONDS,
  VERSION_BROWSER_CACHE_SECONDS,
} from "../utils/constants";
import { getDb } from "../utils/firestore";
import { ExtractClientIdMiddleware, RateLimitMiddleware, AuthenticateGuard } from "./guards/index";

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

    // CDN caches the version for VERSION_CACHE_SECONDS (deploy-time env var,
    // default 5 min) — this is the change-propagation latency. The ETag lets
    // the browser revalidate cheaply (304) within that window.
    ctx.res.set(
      "Cache-Control",
      `public, max-age=${VERSION_BROWSER_CACHE_SECONDS}, s-maxage=${VERSION_CACHE_SECONDS}`,
    );
    ctx.res.set("ETag", `"${version}"`);

    if (ctx.req.headers["if-none-match"] === `"${version}"`) {
      // A 304 is sent directly via res.end(), which bypasses Firebase's
      // `cors: true` wrapper — so the Access-Control-Allow-Origin header it
      // normally injects is absent, and the CDN strips non-conditional headers
      // on a 304. A cross-origin caller then fails CORS on every revalidation.
      // Reflect the request origin explicitly so the 304 carries ACAO itself.
      const origin = ctx.req.headers.origin;
      if (origin) {
        ctx.res.set("Access-Control-Allow-Origin", origin);
        ctx.res.set("Vary", "Origin");
      }
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
