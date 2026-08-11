import { onRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

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

    // 3. Extract optional key filter
    const requestedKeys: string[] | undefined =
      (req.query.keys as string)
        ?.split(",")
        .map((k) => k.trim())
        .filter(Boolean) ??
      (req.body?.data?.keys as string[] | undefined) ??
      undefined;

    // 4. Fetch configs for the environment
    const configsRef = db
      .collection("projects")
      .doc(projectId)
      .collection("environments")
      .doc(environmentId)
      .collection("configs");

    // If specific keys requested, fetch only those (cheaper Firestore reads)
    let configsSnapshot;
    if (
      requestedKeys &&
      requestedKeys.length > 0 &&
      requestedKeys.length <= 10
    ) {
      // Firestore 'in' query supports up to 30 items, but we cap at 10 for sanity
      const docs = await Promise.all(
        requestedKeys.map((key) => configsRef.doc(key).get()),
      );
      configsSnapshot = docs.filter((d) => d.exists);
    } else {
      // Batch mode: fetch all
      const snapshot = await configsRef.get();
      configsSnapshot = snapshot.docs;
    }

    const data: Record<string, unknown> = {};
    let latestUpdate = "";

    for (const doc of configsSnapshot) {
      const configData = doc.data();
      if (!configData) continue;
      data[doc.id] = configData.value;
      if (configData.updatedAt > latestUpdate) {
        latestUpdate = configData.updatedAt;
      }
    }

    // 5. Set CDN cache headers for cheap delivery
    res.set("Cache-Control", "public, max-age=30, s-maxage=60");
    res.set("X-Config-Project", projectId);
    res.set("X-Config-Environment", environmentId);

    // 6. Return in the format the SDK expects
    res.status(200).json({
      data,
      version: String(Object.keys(data).length),
      timestamp: latestUpdate || new Date().toISOString(),
    });
  },
);
