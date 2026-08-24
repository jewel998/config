import { onRequest } from "firebase-functions/v2/https";
import { getDb } from "../utils/firestore.js";
import { BadRequestError, withErrorHandler } from "../utils/errors.js";
import { assertMethod } from "../utils/request.js";
import { sendSuccess } from "../utils/response.js";
import {
  MAX_INSTANCES,
  MIN_INSTANCES,
  API_REGION,
} from "../utils/constants.js";
import { authenticateClient } from "./middleware/authenticate.js";
import { checkRateLimit } from "./middleware/rate-limit.js";

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
  {
    cors: true,
    maxInstances: MAX_INSTANCES,
    minInstances: MIN_INSTANCES,
    region: API_REGION,
    memory: "256MiB",
  },
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

    // Rate limit + authenticate in parallel
    const [, { projectId, environmentId }] = await Promise.all([
      checkRateLimit(db, clientId),
      authenticateClient(db, clientId),
    ]);

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
