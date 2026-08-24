import { onRequest } from "firebase-functions/v2/https";
import { getDb } from "../utils/firestore.js";
import {
  BadRequestError,
  PayloadTooLargeError,
  withErrorHandler,
} from "../utils/errors.js";
import { assertMethod } from "../utils/request.js";
import {
  sendSuccess,
  setCdnCache,
  setPrivateCache,
} from "../utils/response.js";
import {
  MAX_INSTANCES,
  MAX_CONTEXT_SIZE_BYTES,
  MIN_INSTANCES,
  API_REGION,
} from "../utils/constants.js";
import {
  evaluateConfigsForContext,
  type UserContext,
} from "./server-evaluator.js";
import { authenticateClient } from "./middleware/authenticate.js";
import { validateDomain } from "./middleware/validate-domain.js";
import { fetchConfigs } from "./middleware/fetch-configs.js";
import { checkRateLimit } from "./middleware/rate-limit.js";

/**
 * GET  /api/getConfig?clientId=cid_xxx
 * POST /api/getConfig  { data: { clientId: "cid_xxx", keys?: ["a","b"] } }
 *
 * Config delivery API for the @jewel998/config SDK.
 *
 * Security:
 *   - clientId validated against Firestore (must be active)
 *   - Optional domain validation (allowedDomains on environment)
 *   - Read-only: cannot modify configs via this endpoint
 *
 * Cost model:
 *   - CDN-cached for 60s → most requests never hit the function
 *   - Cloud Function: only on cache miss ($0.40 / million invocations)
 *   - Firestore reads: 2 per invocation (clientId lookup + configs)
 *   - With 60s CDN: 10K polls/hour = ~60 function calls/hour = FREE tier
 *
 * Performance:
 *   - Rate limit + authenticate run in parallel
 *   - Domain validation + config/segment fetch run in parallel
 *   - Total: 2 sequential Firestore round-trips (down from 4)
 */
export const getConfig = onRequest(
  {
    cors: true,
    maxInstances: MAX_INSTANCES,
    minInstances: MIN_INSTANCES,
    region: API_REGION,
    memory: "256MiB",
  },
  withErrorHandler(async (req, res) => {
    assertMethod(req, "GET", "POST");

    // Extract clientId from query (GET) or body (POST)
    const clientId =
      (req.query.clientId as string) ??
      (req.body?.data?.clientId as string) ??
      null;

    if (!clientId) {
      throw new BadRequestError("clientId is required");
    }

    const db = getDb();

    // ── Phase 1: Rate limit + Authenticate (parallel) ──────────
    const [, authResult] = await Promise.all([
      checkRateLimit(db, clientId),
      authenticateClient(db, clientId),
    ]);

    const { projectId, environmentId } = authResult;

    // ── Phase 2: Domain validation + Fetch data (parallel) ─────
    const origin = req.headers.origin ?? req.headers.referer ?? "";

    const isServerKey = clientId.startsWith("svr_");
    const evaluationMode = isServerKey ? "client" : "server";

    const userContext: UserContext | null =
      evaluationMode === "server"
        ? ((req.body?.data?.context as UserContext) ?? null)
        : null;

    // Reject oversized context payloads
    if (userContext) {
      const contextSize = JSON.stringify(userContext).length;
      if (contextSize > MAX_CONTEXT_SIZE_BYTES) {
        throw new PayloadTooLargeError("Context payload exceeds 10KB limit");
      }
    }

    // Extract optional key filter
    const requestedKeys: string[] | undefined =
      (req.query.keys as string)
        ?.split(",")
        .map((k) => k.trim())
        .filter(Boolean) ??
      (req.body?.data?.keys as string[] | undefined) ??
      undefined;

    // Run domain validation and data fetching in parallel
    const [, { configs, segments, latestUpdate }] = await Promise.all([
      validateDomain(db, projectId, environmentId, origin),
      fetchConfigs(db, projectId, environmentId, requestedKeys),
    ]);

    // ── Phase 3: Build response ────────────────────────────────
    if (evaluationMode === "server") {
      const { data } = evaluateConfigsForContext(
        configs,
        segments,
        userContext,
      );

      setPrivateCache(res, 30);
      res.set("X-Config-Project", projectId);
      res.set("X-Config-Environment", environmentId);

      sendSuccess(res, {
        data,
        version: String(Object.keys(data).length),
        timestamp: latestUpdate || new Date().toISOString(),
      });
      return;
    }

    // CLIENT EVALUATION MODE — return full flag data + segments
    const data: Record<string, unknown> = {};
    for (const config of configs) {
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

    setCdnCache(res, 30, 60);
    res.set("X-Config-Project", projectId);
    res.set("X-Config-Environment", environmentId);

    sendSuccess(res, {
      data,
      segments,
      version: String(Object.keys(data).length),
      timestamp: latestUpdate || new Date().toISOString(),
    });
  }),
);
