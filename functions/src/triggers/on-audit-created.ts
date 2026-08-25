import { onDocumentCreated } from "firebase-functions/v2/firestore";

import { dispatchWebhook } from "../dispatcher/dispatch-webhook";
import { httpDispatcher } from "../dispatcher/http.dispatcher";
import { evaluateFilters } from "../filters/pipeline";
import type { AuditEntry, WebhookConfig, WebhookDispatcher } from "../types";
import { getDb } from "../utils/firestore";

/**
 * Firestore trigger: fires when a new audit log entry is created.
 * Reads all enabled webhooks for the project, applies the filter pipeline,
 * formats payloads via the formatter registry, and dispatches via the adapter.
 *
 * Delivery outcomes are logged to console only — no Firestore writes on
 * success or failure.
 */
export function createOnAuditCreated(dispatcher: WebhookDispatcher = httpDispatcher) {
  return onDocumentCreated(
    {
      document: "projects/{projectId}/audit_log/{entryId}",
      database: "default",
    },
    async (event) => {
      const { projectId, entryId } = event.params;
      const data = event.data?.data();
      if (!data) return;

      try {
        const entry: AuditEntry = {
          action: data.action,
          actorId: data.actorId,
          timestamp: data.timestamp,
          resourcePath: data.resourcePath,
          oldValue: data.oldValue,
          newValue: data.newValue,
        };

        // Read all enabled webhooks for this project
        const db = getDb();
        const webhooksSnapshot = await db
          .collection("projects")
          .doc(projectId)
          .collection("webhooks")
          .where("enabled", "==", true)
          .get();

        if (webhooksSnapshot.empty) return;

        const webhooks: WebhookConfig[] = webhooksSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as WebhookConfig[];

        // Filter pipeline
        const matching = webhooks.filter((wh) => evaluateFilters(wh, entry));
        if (matching.length === 0) return;

        // Dispatch all matching webhooks — each failure is isolated
        const results = await Promise.allSettled(
          matching.map((wh) => dispatchWebhook(wh, entry, projectId, { dispatcher })),
        );

        // Log outcome per webhook — no Firestore writes
        results.forEach((result, i) => {
          const wh = matching[i];

          if (result.status === "fulfilled" && result.value.success) {
            // Delivery succeeded
            console.log(
              `[onAuditCreated] Delivered webhook ${wh.id} (${wh.format}) ` +
                `for entry ${entryId} — HTTP ${result.value.httpStatus} ` +
                `in ${result.value.duration}ms`,
            );
          } else if (result.status === "fulfilled" && !result.value.success) {
            // Delivery reached the target but was rejected (non-2xx response)
            console.error(
              `[onAuditCreated] Webhook ${wh.id} (${wh.format}) rejected ` +
                `for entry ${entryId} — ${result.value.error ?? `HTTP ${result.value.httpStatus}`}`,
            );
          } else if (result.status === "rejected") {
            // Unexpected error — formatter threw, dispatcher crashed, etc.
            // This is a programming/infrastructure error, not a delivery failure.
            console.error(
              `[onAuditCreated] Unexpected error dispatching webhook ${wh.id} (${wh.format}) ` +
                `for entry ${entryId} — ${String(result.reason)}`,
            );
          }
        });
      } catch (error) {
        console.error(
          `[onAuditCreated] Unexpected error processing entry ${entryId} ` +
            `in project ${projectId}:`,
          error,
        );
      }
    },
  );
}
