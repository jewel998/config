import { onRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
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
 *
 * Rate Limiting (optional — enable if needed):
 *   To add rate limiting, uncomment the section below and create a
 *   Firestore collection `rateLimits/{clientId}` with fields:
 *     - count: number (requests in current window)
 *     - windowStart: timestamp (start of current window)
 *
 *   // --- RATE LIMITING (uncomment to enable) ---
 *   // const RATE_LIMIT = 100; // requests per minute
 *   // const WINDOW_MS = 60_000;
 *   // const rateLimitRef = db.collection("rateLimits").doc(clientId);
 *   // const rateLimitDoc = await rateLimitRef.get();
 *   // const now = Date.now();
 *   // if (rateLimitDoc.exists) {
 *   //   const { count, windowStart } = rateLimitDoc.data()!;
 *   //   if (now - windowStart < WINDOW_MS && count >= RATE_LIMIT) {
 *   //     res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many requests" } });
 *   //     return;
 *   //   }
 *   //   if (now - windowStart >= WINDOW_MS) {
 *   //     await rateLimitRef.set({ count: 1, windowStart: now });
 *   //   } else {
 *   //     await rateLimitRef.update({ count: count + 1 });
 *   //   }
 *   // } else {
 *   //   await rateLimitRef.set({ count: 1, windowStart: now });
 *   // }
 *   // --- END RATE LIMITING ---
 */
export const getConfig = onRequest(
  { cors: true, maxInstances: 10 },
  async (req, res) => {
    // Only allow GET (CDN-cacheable) and POST (SDK compatibility)
    if (req.method !== "GET" && req.method !== "POST") {
      res.status(405).json({
        error: { code: "METHOD_NOT_ALLOWED", message: "Use GET or POST" },
      });
      return;
    }

    // Extract clientId from query (GET) or body (POST)
    const clientId =
      (req.query.clientId as string) ??
      (req.body?.data?.clientId as string) ??
      null;

    if (!clientId) {
      res.status(400).json({
        error: { code: "MISSING_CLIENT_ID", message: "clientId is required" },
      });
      return;
    }

    const db = getFirestore();

    // 1. Find which project+environment this clientId belongs to
    // ClientIds are stored at: projects/{projectId}/environments/{envId}/clientIds/{token}
    // We need to query across all projects — use a collectionGroup query
    const clientIdSnapshot = await db
      .collectionGroup("clientIds")
      .where("token", "==", clientId)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (clientIdSnapshot.empty) {
      res.status(401).json({
        error: {
          code: "INVALID_CLIENT_ID",
          message: "Invalid or revoked clientId",
        },
      });
      return;
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
            res.status(403).json({
              error: {
                code: "DOMAIN_NOT_ALLOWED",
                message: `Origin ${requestDomain} is not in allowedDomains`,
              },
            });
            return;
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

    // Reject oversized context payloads (> 10KB)
    if (userContext) {
      const contextSize = JSON.stringify(userContext).length;
      if (contextSize > 10240) {
        res.status(413).json({
          error: {
            code: "CONTEXT_TOO_LARGE",
            message: "Context payload exceeds 10KB limit",
          },
        });
        return;
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

      const { data, warnings } = evaluateConfigsForContext(
        configs,
        segments,
        userContext,
      );

      // Private cache — varies by context, not CDN-cacheable
      res.set("Cache-Control", "private, max-age=30");
      res.set("X-Config-Project", projectId);
      res.set("X-Config-Environment", environmentId);

      // Never expose warnings to client keys — they could reveal internal
      // flag names, prerequisite relationships, or segment structure.
      res.status(200).json({
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
    res.set("Cache-Control", "public, max-age=30, s-maxage=60");
    res.set("X-Config-Project", projectId);
    res.set("X-Config-Environment", environmentId);

    res.status(200).json({
      data,
      segments,
      version: String(Object.keys(data).length),
      timestamp: latestUpdate || new Date().toISOString(),
    });
  },
);
