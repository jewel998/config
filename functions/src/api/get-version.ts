import { onRequest } from "firebase-functions/v2/https";
import { getDb } from "../utils/firestore.js";
import {
  BadRequestError,
  InternalError,
  UnauthorizedError,
  withErrorHandler,
} from "../utils/errors.js";
import { assertMethod } from "../utils/request.js";
import { sendSuccess } from "../utils/response.js";
import { MAX_INSTANCES } from "../utils/constants.js";

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
  { cors: true, maxInstances: MAX_INSTANCES },
  withErrorHandler(async (req, res) => {
    assertMethod(req, "GET", "POST");

    const clientId =
      (req.query.clientId as string) ??
      (req.body?.data?.clientId as string) ??
      null;

    if (!clientId) {
      throw new BadRequestError("clientId is required");
    }

    const db = getDb();

    // Find project + environment from clientId
    let clientIdSnapshot;
    try {
      clientIdSnapshot = await db
        .collectionGroup("clientIds")
        .where("token", "==", clientId)
        .where("status", "==", "active")
        .limit(1)
        .get();
    } catch (error) {
      const grpcCode = (error as { code?: number }).code;
      const msg = error instanceof Error ? error.message : String(error);
      console.error(
        `[getVersion] Firestore collectionGroup query failed. ` +
          `gRPC code: ${grpcCode}, message: ${msg}. ` +
          `Ensure the composite index for clientIds is deployed.`,
      );
      throw new InternalError(
        "Failed to validate clientId. The required Firestore index may not exist.",
      );
    }

    if (clientIdSnapshot.empty) {
      throw new UnauthorizedError("Invalid or revoked clientId");
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

    sendSuccess(res, { version, changedKeys });
  }),
);
