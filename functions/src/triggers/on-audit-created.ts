import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { DISPATCH_TIMEOUT_MS } from "../constants.js";
import { writeDeliveryLog } from "../delivery/write-delivery-log.js";
import { httpDispatcher } from "../dispatcher/http.dispatcher.js";
import { evaluateFilters } from "../filters/pipeline.js";
import { getFormatter } from "../formatters/registry.js";
import type { AuditEntry, WebhookConfig, WebhookDispatcher } from "../types.js";

/**
 * Firestore trigger: fires when a new audit log entry is created.
 * Reads all enabled webhooks for the project, applies the filter pipeline,
 * formats payloads via the formatter registry, and dispatches via the adapter.
 */
export function createOnAuditCreated(
  dispatcher: WebhookDispatcher = httpDispatcher,
) {
  return onDocumentCreated(
    {
      document: "projects/{projectId}/audit_log/{entryId}",
      database: "default",
    },
    async (event) => {
      const { projectId, entryId } = event.params;
      const data = event.data?.data();
      if (!data) return;

      const entry: AuditEntry = {
        action: data.action,
        actorId: data.actorId,
        timestamp: data.timestamp,
        resourcePath: data.resourcePath,
        oldValue: data.oldValue,
        newValue: data.newValue,
      };

      // Read all enabled webhooks for this project
      const db = getFirestore("default");
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

      // Filter pipeline (Chain of Responsibility)
      const matching = webhooks.filter((wh) => evaluateFilters(wh, entry));
      if (matching.length === 0) return;

      // Format + Dispatch (Strategy + Adapter)
      const results = await Promise.allSettled(
        matching.map(async (wh) => {
          const formatter = getFormatter(wh.format);
          const payload = formatter.format(entry, wh, projectId);
          return dispatcher.dispatch(wh.url, payload, {
            timeout: DISPATCH_TIMEOUT_MS,
            headers: {
              "Content-Type": formatter.contentType,
              "X-Webhook-Id": wh.id,
              "X-Webhook-Timestamp": String(Math.floor(Date.now() / 1000)),
            },
          });
        }),
      );

      // Write delivery logs
      await Promise.all(
        results.map((result, i) => {
          const dispatchResult =
            result.status === "fulfilled"
              ? result.value
              : {
                  success: false,
                  httpStatus: null,
                  duration: 0,
                  error: String(result.reason),
                };
          return writeDeliveryLog(
            projectId,
            matching[i].id,
            dispatchResult,
            entryId,
            false,
          );
        }),
      );
    },
  );
}
