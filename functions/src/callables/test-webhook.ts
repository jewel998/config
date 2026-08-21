import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { DISPATCH_TIMEOUT_MS } from "../constants.js";
import { writeDeliveryLog } from "../delivery/write-delivery-log.js";
import { httpDispatcher } from "../dispatcher/http.dispatcher.js";
import { getFormatter } from "../formatters/registry.js";
import type { AuditEntry, WebhookConfig } from "../types.js";

/**
 * Callable function for testing webhook delivery.
 * Sends a sample payload to the configured URL and returns the result.
 */
export const testWebhook = onCall<{ projectId: string; webhookId: string }>(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }

    const { projectId, webhookId } = request.data;
    if (!projectId || !webhookId) {
      throw new HttpsError(
        "invalid-argument",
        "projectId and webhookId are required",
      );
    }

    const db = getFirestore();

    // Verify admin role
    const projectDoc = await db.collection("projects").doc(projectId).get();
    if (!projectDoc.exists) {
      throw new HttpsError("not-found", "Project not found");
    }
    const projectData = projectDoc.data();
    const roles = (projectData?.roles ?? {}) as Record<string, string>;
    if (
      roles[request.auth.uid] !== "admin" &&
      projectData?.ownerId !== request.auth.uid
    ) {
      throw new HttpsError(
        "permission-denied",
        "Only admins can test webhooks",
      );
    }

    // Read webhook config
    const webhookDoc = await db
      .collection("projects")
      .doc(projectId)
      .collection("webhooks")
      .doc(webhookId)
      .get();

    if (!webhookDoc.exists) {
      throw new HttpsError("not-found", "Webhook not found");
    }

    const webhook = {
      id: webhookDoc.id,
      ...webhookDoc.data(),
    } as WebhookConfig;

    // Build sample test payload
    const testEntry: AuditEntry = {
      action: "update",
      actorId: request.auth.uid,
      timestamp: new Date().toISOString(),
      resourcePath: "environments/test/configs/sample.flag",
      oldValue: JSON.stringify({ value: false }),
      newValue: JSON.stringify({ value: true }),
    };

    const formatter = getFormatter(webhook.format);
    const payload = formatter.format(testEntry, webhook, projectId);

    // Add test flag
    if (typeof payload === "object" && payload !== null) {
      (payload as Record<string, unknown>).test = true;
    }

    // Dispatch
    const result = await httpDispatcher.dispatch(webhook.url, payload, {
      timeout: DISPATCH_TIMEOUT_MS,
      headers: {
        "Content-Type": formatter.contentType,
        "X-Webhook-Id": webhook.id,
        "X-Webhook-Timestamp": String(Math.floor(Date.now() / 1000)),
      },
    });

    // Write delivery log
    await writeDeliveryLog(projectId, webhookId, result, "test", true);

    return {
      success: result.success,
      httpStatus: result.httpStatus,
      error: result.error,
    };
  },
);
