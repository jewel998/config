import { onRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

/**
 * GET /getConfig?clientId=cid_xxx
 *
 * The cheapest possible config delivery:
 * - Single Firestore read per cache miss
 * - CDN-cached for 60s (configurable via Cache-Control)
 * - No auth overhead beyond clientId lookup
 * - Supports domain validation via allowedDomains
 *
 * Cost model:
 *   - Cloud Function invocation: only on cache miss ($0.40 / million)
 *   - Firestore reads: 2 per invocation (clientId doc + configs collection)
 *   - CDN egress: included in Firebase Hosting free tier
 *   - With 60s cache: 10,000 SDK polls/hour = ~60 function calls/hour
 */
export const getConfig = onRequest(
  { cors: true, maxInstances: 10 },
  async (req, res) => {
    // Only allow GET (CDN-cacheable) and POST (SDK compatibility)
    if (req.method !== "GET" && req.method !== "POST") {
      res
        .status(405)
        .json({
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
      res
        .status(400)
        .json({
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
      res
        .status(401)
        .json({
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
            res
              .status(403)
              .json({
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

    // 3. Fetch all configs for the environment
    const configsSnapshot = await db
      .collection("projects")
      .doc(projectId)
      .collection("environments")
      .doc(environmentId)
      .collection("configs")
      .get();

    const data: Record<string, unknown> = {};
    let latestUpdate = "";

    for (const doc of configsSnapshot.docs) {
      const configData = doc.data();
      data[doc.id] = configData.value;
      if (configData.updatedAt > latestUpdate) {
        latestUpdate = configData.updatedAt;
      }
    }

    // 4. Set CDN cache headers for cheap delivery
    // Cache for 60s at CDN, 30s in browser — config changes are near-real-time
    // To get instant propagation, users can call SDK.refresh() which bypasses cache
    res.set("Cache-Control", "public, max-age=30, s-maxage=60");
    res.set("X-Config-Project", projectId);
    res.set("X-Config-Environment", environmentId);

    // 5. Return in the format the SDK expects
    res.status(200).json({
      data,
      version: String(configsSnapshot.size),
      timestamp: latestUpdate || new Date().toISOString(),
    });
  },
);
