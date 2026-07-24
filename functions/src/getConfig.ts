import { getFirestore } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";

import { isOriginAllowed } from "./originCheck";
import { isRateLimited } from "./rateLimit";

export const getConfig = onRequest(
  { cors: true, region: "us-central1" },
  async (req, res) => {
    const body = req.body as { data?: { clientId?: string; keys?: string[] } };
    const clientId = body.data?.clientId;
    const keys = body.data?.keys;

    // 1. Validate clientId presence
    if (!clientId) {
      res.status(400).json({
        error: { code: "INVALID_ARGUMENT", message: "clientId is required" },
      });
      return;
    }

    // 2. Look up clientId in Firestore (collectionGroup query)
    const db = getFirestore();
    const clientIdQuery = db
      .collectionGroup("clientIds")
      .where("token", "==", clientId)
      .where("status", "==", "active")
      .limit(1);

    const snapshot = await clientIdQuery.get();
    if (snapshot.empty) {
      res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Invalid or revoked clientId",
        },
      });
      return;
    }

    // 3. Extract project + environment from document path
    const clientIdDoc = snapshot.docs[0]!;
    const pathSegments = clientIdDoc.ref.path.split("/");
    // Path: projects/{projectId}/environments/{envId}/clientIds/{token}
    const projectId = pathSegments[1]!;
    const environmentId = pathSegments[3]!;

    // 4. Check origin against allowed domains
    const origin = req.headers.origin ?? req.headers.referer ?? "";
    const envDoc = await db
      .collection("projects")
      .doc(projectId)
      .collection("environments")
      .doc(environmentId)
      .get();

    const envData = envDoc.data();
    const allowedDomains: string[] =
      (envData?.allowedDomains as string[]) ?? [];

    if (!isOriginAllowed(origin as string, allowedDomains)) {
      res.status(403).json({
        error: { code: "PERMISSION_DENIED", message: "Origin not allowed" },
      });
      return;
    }

    // 5. Rate limiting check
    if (await isRateLimited(clientId)) {
      res.status(429).json({
        error: {
          code: "RESOURCE_EXHAUSTED",
          message: "Rate limit exceeded",
        },
      });
      return;
    }

    // 6. Fetch configs
    const configsRef = db
      .collection("projects")
      .doc(projectId)
      .collection("environments")
      .doc(environmentId)
      .collection("configs");

    let configSnapshot;
    if (keys && keys.length > 0) {
      // Projected: fetch only requested keys (Firestore "in" supports up to 30)
      configSnapshot = await configsRef.where("key", "in", keys).get();
    } else {
      // Batch: fetch all
      configSnapshot = await configsRef.get();
    }

    const data: Record<string, unknown> = {};
    let latestVersion = "0";
    for (const doc of configSnapshot.docs) {
      const config = doc.data();
      data[config.key as string] = config.value;
      if ((config.version as string) > latestVersion) {
        latestVersion = config.version as string;
      }
    }

    // 7. Return scoped config
    res.status(200).json({
      data,
      version: latestVersion,
      timestamp: new Date().toISOString(),
    });
  },
);
