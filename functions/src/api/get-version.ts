import { onRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

/**
 * GET /api/version?clientId=cid_xxx
 *
 * Lightweight version check endpoint for the SDK.
 * Returns the current config version for the environment + list of keys
 * changed since the last version. The SDK compares this with its cached
 * version and only fetches full data if different.
 *
 * Cost: 1 Firestore read (environment doc) — CDN-cached for 15s.
 * At 1M users polling every 5 min: 200K req/5min → CDN serves most,
 * ~800 function calls/5min (well within free tier).
 */
export const getVersion = onRequest(
  { cors: true, maxInstances: 10 },
  async (req, res) => {
    if (req.method !== "GET" && req.method !== "POST") {
      res.status(405).json({
        error: { code: "METHOD_NOT_ALLOWED", message: "Use GET or POST" },
      });
      return;
    }

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

    const db = getFirestore("default");

    // Find project + environment from clientId
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

    const pathParts = clientIdSnapshot.docs[0].ref.path.split("/");
    const projectId = pathParts[1];
    const environmentId = pathParts[3];

    // Read the environment's version info (single doc read)
    const envDoc = await db
      .collection("projects")
      .doc(projectId)
      .collection("environments")
      .doc(environmentId)
      .get();

    const envData = envDoc.data() ?? {};
    const version = envData.configVersion ?? "0";
    const changedKeys: string[] = envData.lastChangedKeys ?? [];

    // CDN cache for 15s — lightweight enough to serve cheaply
    res.set("Cache-Control", "public, max-age=10, s-maxage=15");
    res.set("ETag", `"${version}"`);

    // Support conditional requests (If-None-Match)
    const ifNoneMatch = req.headers["if-none-match"];
    if (ifNoneMatch === `"${version}"`) {
      res.status(304).end();
      return;
    }

    res.status(200).json({ version, changedKeys });
  },
);
