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
import { handleCors } from "../utils/cors";
import { getDb } from "../utils/firestore";
import { ExtractClientIdMiddleware, RateLimitMiddleware, AuthenticateGuard } from "./guards/index";

function matchesEtag(ifNoneMatch: string | string[] | undefined, etag: string): boolean {
  if (!ifNoneMatch) return false;

  const values = Array.isArray(ifNoneMatch) ? ifNoneMatch : [ifNoneMatch];
  return values.some((value) =>
    value.split(",").some((candidate) => {
      const normalized = candidate.trim();
      return normalized === "*" || normalized.replace(/^W\//, "") === etag;
    }),
  );
}

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

    // Cache the version at Firebase Hosting's shared CDN. The SDK bypasses
    // browser conditional caching, so the CDN serves a cached 200 with the
    // validated CORS headers instead of generating a CORS-less 304.
    ctx.res.set(
      "Cache-Control",
      `public, max-age=${VERSION_BROWSER_CACHE_SECONDS}, s-maxage=${VERSION_CACHE_SECONDS}`,
    );
    ctx.res.set("ETag", `"${version}"`);

    if (matchesEtag(ctx.req.headers["if-none-match"], `"${version}"`)) {
      ctx.res.status(304).end();
      return;
    }

    return { data: { version, changedKeys } };
  }
}

// ── Export ────────────────────────────────────────────────────

const getVersionHandler = createHandler(GetVersionHandler, {
  createContext: (req, res) => ({ req, res, db: getDb() }),
});

export const getVersion = onRequest(
  {
    maxInstances: MAX_INSTANCES,
    minInstances: MIN_INSTANCES,
    region: API_REGION,
    memory: "256MiB",
  },
  async (req, res) => {
    if (await handleCors(req, res, getDb())) return;

    return getVersionHandler(req, res);
  },
);
