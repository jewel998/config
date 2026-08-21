import { onRequest } from "firebase-functions/v2/https";
import { getDb } from "../utils/firestore.js";
import {
  BadRequestError,
  ForbiddenError,
  PayloadTooLargeError,
  UnauthorizedError,
  withErrorHandler,
} from "../utils/errors.js";
import { assertMethod } from "../utils/request.js";
import {
  sendSuccess,
  setCdnCache,
  setPrivateCache,
} from "../utils/response.js";
import { MAX_INSTANCES, MAX_CONTEXT_SIZE_BYTES } from "../utils/constants.js";
import {
  evaluateConfigsForContext,
  type ConfigDoc,
  type SegmentDoc,
  type UserContext,
} from "./server-evaluator.js";

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
 */
export const getConfig = onRequest(
  { cors: true, maxInstances: MAX_INSTANCES },
  withErrorHandler(async (req, res) => {
    // Only allow GET (CDN-cacheable) and POST (SDK compatibility)
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

    // 1. Find which project+environment this clientId belongs to
    const clientIdSnapshot = await db
      .collectionGroup("clientIds")
      .where("token", "==", clientId)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (clientIdSnapshot.empty) {
      throw new UnauthorizedError("Invalid or revoked clientId");
    }

    const clientIdDoc = clientIdSnapshot.docs[0];
    // Path: projects/{projectId}/environments/{envId}/clientIds/{token}
    const pathParts = clientIdDoc.ref.path.split("/");
    const projectId = pathParts[1];
    const environmentId = pathParts[3];

    // 2. Optional: Domain validation
    const origin = req.headers.origin ?? req.headers.referer ?? "";
    if (origin) {
      const envDoc = await db
        .collection("projects")
        .doc(projectId)
        .collection("environments")
        .doc(environmentId)
        .get();

      if (envDoc.exists) {
        const allowedDomains: string[] = envDoc.data()?.allowedDomains ?? [];
        if (allowedDomains.length > 0) {
          const requestDomain = new URL(origin).hostname;
          const isAllowed = allowedDomains.some(
            (d) => requestDomain === d || requestDomain.endsWith(`.${d}`),
          );
          if (!isAllowed) {
            throw new ForbiddenError(
              `Origin ${requestDomain} is not in allowedDomains`,
            );
          }
        }
      }
    }

    // 3. Determine evaluation mode from key prefix (enforced, not client-controlled)
    // cid_ = client key → always server-evaluate, never expose rules/segments
    // svr_ = server key → return full flag data for local SDK evaluation
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

    // 4. Extract optional key filter
    const requestedKeys: string[] | undefined =
      (req.query.keys as string)
        ?.split(",")
        .map((k) => k.trim())
        .filter(Boolean) ??
      (req.body?.data?.keys as string[] | undefined) ??
      undefined;

    // 5. Fetch configs for the environment
    const configsRef = db
      .collection("projects")
      .doc(projectId)
      .collection("environments")
      .doc(environmentId)
      .collection("configs");

    let configsSnapshot;
    if (
      requestedKeys &&
      requestedKeys.length > 0 &&
      requestedKeys.length <= 10
    ) {
      const docs = await Promise.all(
        requestedKeys.map((key) => configsRef.doc(key).get()),
      );
      configsSnapshot = docs.filter((d) => d.exists);
    } else {
      const snapshot = await configsRef.get();
      configsSnapshot = snapshot.docs;
    }

    // 6. Fetch segments (needed for both modes)
    const segmentsSnapshot = await db
      .collection("projects")
      .doc(projectId)
      .collection("segments")
      .get();

    const segments: Record<string, SegmentDoc> = {};
    for (const doc of segmentsSnapshot.docs) {
      const segData = doc.data();
      segments[doc.id] = {
        id: doc.id,
        name: segData.name ?? "",
        conditions: segData.conditions ?? [],
      };
    }

    // Track latest update for version/timestamp
    let latestUpdate = "";

    // ═══════════════════════════════════════════════════════════
    // SERVER EVALUATION MODE (default)
    // Evaluate targeting, rollout, segments server-side.
    // Return only resolved values — no business logic exposed.
    // ═══════════════════════════════════════════════════════════
    if (evaluationMode === "server") {
      const configs: ConfigDoc[] = [];

      for (const doc of configsSnapshot) {
        const d = doc.data();
        if (!d) continue;
        configs.push({
          key: doc.id,
          value: d.value,
          valueType: d.valueType ?? "string",
          version: d.version ?? "1",
          lifecycleState: d.lifecycleState ?? "active",
          targetingRules: d.targetingRules,
          rolloutPercentage: d.rolloutPercentage,
          rolloutValue: d.rolloutValue,
          overrides: d.overrides,
          schedule: d.schedule,
          prerequisites: d.prerequisites,
        });
        if (d.updatedAt > latestUpdate) latestUpdate = d.updatedAt;
      }

      const { data } = evaluateConfigsForContext(
        configs,
        segments,
        userContext,
      );

      // Private cache — varies by context, not CDN-cacheable
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

    // ═══════════════════════════════════════════════════════════
    // CLIENT EVALUATION MODE (opt-in)
    // Return full flag data + segments for local SDK evaluation.
    // ═══════════════════════════════════════════════════════════
    const data: Record<string, unknown> = {};

    for (const doc of configsSnapshot) {
      const configData = doc.data();
      if (!configData) continue;

      data[doc.id] = {
        key: doc.id,
        value: configData.value,
        valueType: configData.valueType ?? "string",
        version: configData.version ?? "1",
        lifecycleState: configData.lifecycleState ?? "active",
        ...(configData.targetingRules && {
          targetingRules: configData.targetingRules,
        }),
        ...(configData.rolloutPercentage != null && {
          rolloutPercentage: configData.rolloutPercentage,
        }),
        ...(configData.rolloutValue !== undefined && {
          rolloutValue: configData.rolloutValue,
        }),
        ...(configData.overrides && { overrides: configData.overrides }),
        ...(configData.schedule && { schedule: configData.schedule }),
        ...(configData.prerequisites && {
          prerequisites: configData.prerequisites,
        }),
      };

      if (configData.updatedAt > latestUpdate) {
        latestUpdate = configData.updatedAt;
      }
    }

    // Public cache — CDN-cacheable (same response for all consumers)
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
