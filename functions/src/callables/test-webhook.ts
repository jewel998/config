import { onCall, HttpsError } from "firebase-functions/v2/https";

import { WebhookProvider } from "../providers/webhook-provider";
import { WebhookProviderFactory } from "../providers/webhook-provider-factory";
import type { WebhookConfig } from "../types";
import { getDb } from "../utils/firestore";

/**
 * Callable function for testing webhook delivery.
 *
 * Uses the same WebhookProvider + WebhookFormatter hierarchy as real dispatches:
 *   1. Build a canonical test AuditEntry via WebhookProvider.buildTestEntry()
 *   2. Create the correct provider via WebhookProviderFactory.create()
 *   3. Trigger with mutatePayload to inject the test flag
 *
 * Outcome is logged to console only — no Firestore writes.
 */
export const testWebhook = onCall<{ projectId: string; webhookId: string }>(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const { projectId, webhookId } = request.data;
  if (!projectId || !webhookId) {
    throw new HttpsError("invalid-argument", "projectId and webhookId are required");
  }

  const db = getDb();

  // Verify admin role
  const projectDoc = await db.collection("projects").doc(projectId).get();
  if (!projectDoc.exists) {
    throw new HttpsError("not-found", "Project not found");
  }
  const projectData = projectDoc.data();
  const roles = (projectData?.roles ?? {}) as Record<string, string>;
  if (roles[request.auth.uid] !== "admin" && projectData?.ownerId !== request.auth.uid) {
    throw new HttpsError("permission-denied", "Only admins can test webhooks");
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

  const webhook = { id: webhookDoc.id, ...webhookDoc.data() } as WebhookConfig;

  // Build canonical test entry, create provider — same path as real dispatches
  const testEntry = WebhookProvider.buildTestEntry(request.auth.uid);
  const provider = WebhookProviderFactory.create(webhook, testEntry, projectId);

  const result = await provider.trigger({
    mutatePayload: (payload) => {
      payload.test = true;
    },
  });

  if (result.success) {
    console.log(
      `[testWebhook] Delivered webhook ${webhookId} (${webhook.format}) ` +
        `— HTTP ${result.httpStatus} in ${result.duration}ms`,
    );
  } else {
    console.error(
      `[testWebhook] Failed to deliver webhook ${webhookId} (${webhook.format}) ` +
        `— ${result.error ?? `HTTP ${result.httpStatus}`}`,
    );
  }

  return {
    success: result.success,
    httpStatus: result.httpStatus,
    error: result.error,
  };
});
