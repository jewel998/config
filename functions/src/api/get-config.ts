// ═══════════════════════════════════════════════════════════════
// getConfig — Config Delivery API
//
// GET  /api/v1/config?clientId=cid_xxx
// POST /api/v1/config  { data: { clientId: "cid_xxx", keys?: [...] } }
// ═══════════════════════════════════════════════════════════════

import { Methods, UseMiddleware, UseGuards, RequestHandler, createHandler } from "@jewel998/api";
import type { RequestContext, HandlerResponse } from "@jewel998/api";
import { onRequest } from "firebase-functions/v2/https";

import { MAX_INSTANCES, MIN_INSTANCES, API_REGION } from "../utils/constants";
import { getDb } from "../utils/firestore";
import {
  ExtractClientIdMiddleware,
  ValidateKeyMethodGuard,
  ExtractContextGuard,
  RateLimitMiddleware,
  AuthenticateGuard,
  ValidateDomainGuard,
  FetchConfigsGuard,
} from "./guards/index";
import { evaluateConfigsForContext } from "./server-evaluator";

// ── Handler ──────────────────────────────────────────────────

@Methods("GET", "POST")
@UseMiddleware(new ExtractClientIdMiddleware(), new RateLimitMiddleware())
@UseGuards(
  new ValidateKeyMethodGuard(),
  new ExtractContextGuard(),
  new AuthenticateGuard(),
  new ValidateDomainGuard(),
  new FetchConfigsGuard(),
)
class GetConfigHandler extends RequestHandler {
  handle(ctx: RequestContext): HandlerResponse {
    const { configs, segments, latestUpdate, evaluationMode, projectId, environmentId } = ctx;

    ctx.res.set("X-Config-Project", projectId!);
    ctx.res.set("X-Config-Environment", environmentId!);

    if (evaluationMode === "server") {
      const { data } = evaluateConfigsForContext(configs!, segments!, ctx.userContext ?? null);
      ctx.res.set("Cache-Control", "private, max-age=30");

      return {
        data,
        version: ctx.version,
        timestamp: latestUpdate || new Date().toISOString(),
      };
    }

    const data: Record<string, unknown> = {};
    for (const config of configs!) {
      data[config.key] = {
        key: config.key,
        value: config.value,
        valueType: config.valueType ?? "string",
        version: config.version ?? "1",
        lifecycleState: config.lifecycleState ?? "active",
        ...(config.targetingRules && { targetingRules: config.targetingRules }),
        ...(config.rolloutPercentage != null && {
          rolloutPercentage: config.rolloutPercentage,
        }),
        ...(config.rolloutValue !== undefined && {
          rolloutValue: config.rolloutValue,
        }),
        ...(config.overrides && { overrides: config.overrides }),
        ...(config.schedule && { schedule: config.schedule }),
        ...(config.prerequisites && { prerequisites: config.prerequisites }),
      };
    }

    ctx.res.set("Cache-Control", "public, max-age=30, s-maxage=60");

    return {
      data,
      segments,
      version: ctx.version,
      timestamp: latestUpdate || new Date().toISOString(),
    };
  }
}

// ── Export ────────────────────────────────────────────────────

export const getConfig = onRequest(
  {
    cors: true,
    maxInstances: MAX_INSTANCES,
    minInstances: MIN_INSTANCES,
    region: API_REGION,
    memory: "256MiB",
  },
  createHandler(GetConfigHandler, {
    createContext: (req, res) => ({ req, res, db: getDb() }),
  }),
);
