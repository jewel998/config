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

function setCorsHeaders(res: { set: (field: string, value: string) => unknown }): void {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, If-None-Match");
  res.set("Access-Control-Expose-Headers", "ETag");
  res.set("Access-Control-Max-Age", "86400");
}

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

    // CDN caches the version for VERSION_CACHE_SECONDS (deploy-time env var,
    // default 5 min) — this is the change-propagation latency. The ETag lets
    // the browser revalidate cheaply (304) within that window.
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
  (req, res) => {
    // Set these before the handler can return a 304. Firebase Hosting/CDN must
    // receive CORS headers on both 200 and conditional 304 responses.
    setCorsHeaders(res);

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    return getVersionHandler(req, res);
  },
);
