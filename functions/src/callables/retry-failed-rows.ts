import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "../utils/firestore";
import { MAX_INSTANCES } from "../utils/constants";
import { validateEntry } from "../utils/import-validator";
import type { CorrectedEntry, RetryResponse } from "../import-export-types";

interface RetryCallableData {
  projectId: string;
  jobId: string;
  entries: CorrectedEntry[];
  dismiss?: string[]; // rowIds to dismiss without persisting
}

/**
 * retryFailedRows — HTTPS Callable Cloud Function
 *
 * Re-validates and persists corrected failed rows, or dismisses them.
 * When all failed rows are resolved, updates the Import_Job status to "resolved".
 */
export const retryFailedRows = onCall(
  { maxInstances: MAX_INSTANCES },
  async (request) => {
    // ─── Auth Check ──────────────────────────────────────────
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    const uid = request.auth.uid;

    // ─── Argument Validation ─────────────────────────────────
    const data = request.data as RetryCallableData;
    if (!data.projectId || !data.jobId) {
      throw new HttpsError(
        "invalid-argument",
        "projectId and jobId are required",
      );
    }

    const db = getDb();
    const projectRef = db.collection("projects").doc(data.projectId);

    // ─── RBAC Check ──────────────────────────────────────────
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) {
      throw new HttpsError("not-found", "Project not found");
    }
    const projectData = projectSnap.data()!;
    const roles: Record<string, string> = projectData.roles || {};
    const userRole =
      projectData.ownerId === uid ? "admin" : (roles[uid] ?? null);

    if (!userRole || !["admin", "editor"].includes(userRole)) {
      throw new HttpsError(
        "permission-denied",
        "Insufficient permissions for this operation",
      );
    }

    // ─── Load Import Job ─────────────────────────────────────
    const jobRef = projectRef.collection("import_jobs").doc(data.jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) {
      throw new HttpsError("not-found", "Import job not found");
    }
    const jobData = jobSnap.data()!;
    const envRef = projectRef
      .collection("environments")
      .doc(jobData.environmentId);

    const now = new Date().toISOString();
    const results: RetryResponse["results"] = [];

    // ─── Process Dismissals ──────────────────────────────────
    if (data.dismiss && data.dismiss.length > 0) {
      for (const rowId of data.dismiss) {
        const rowRef = jobRef.collection("failed_rows").doc(rowId);
        const rowSnap = await rowRef.get();
        if (rowSnap.exists) {
          await rowRef.delete();
          results.push({ rowId, success: true });
        } else {
          results.push({ rowId, success: false, error: "Row not found" });
        }
      }
      // Atomically increment dismissed count
      await jobRef.update({
        dismissedCount: FieldValue.increment(data.dismiss.length),
        failedCount: FieldValue.increment(-data.dismiss.length),
      });
    }

    // ─── Process Corrected Entries ───────────────────────────
    if (data.entries && data.entries.length > 0) {
      for (const corrected of data.entries) {
        // Re-validate
        const error = validateEntry(
          {
            key: corrected.key,
            value: corrected.value,
            valueType: corrected.valueType,
          },
          0,
        );

        if (error) {
          // Update the failed row with new reason
          const rowRef = jobRef.collection("failed_rows").doc(corrected.rowId);
          await rowRef.update({ reason: error.reason });
          results.push({
            rowId: corrected.rowId,
            success: false,
            error: error.reason,
          });
          continue;
        }

        // Persist the corrected entry
        try {
          const configRef = envRef.collection("configs").doc(corrected.key);
          await configRef.set(
            {
              key: corrected.key,
              value: corrected.value,
              valueType: corrected.valueType,
              version: "1",
              publishedAt: now,
              updatedAt: now,
              updatedBy: uid,
            },
            { merge: true },
          );

          // Remove from failed_rows
          const rowRef = jobRef.collection("failed_rows").doc(corrected.rowId);
          await rowRef.delete();

          // Atomically increment succeeded count and decrement failed count
          await jobRef.update({
            succeededCount: FieldValue.increment(1),
            failedCount: FieldValue.increment(-1),
          });

          results.push({ rowId: corrected.rowId, success: true });
        } catch (e) {
          results.push({
            rowId: corrected.rowId,
            success: false,
            error: e instanceof Error ? e.message : "Write failed",
          });
        }
      }
    }

    // ─── Check if all failed rows are resolved ───────────────
    const remainingRows = await jobRef.collection("failed_rows").limit(1).get();
    if (remainingRows.empty) {
      await jobRef.update({ status: "resolved" });
    }

    // ─── Write Audit Log ─────────────────────────────────────
    const auditRef = projectRef.collection("audit_log").doc();
    await auditRef.set({
      action: "bulk_import_retry",
      actorId: uid,
      timestamp: now,
      resourcePath: `import_jobs/${data.jobId}`,
      newValue: JSON.stringify({
        retried: data.entries?.length ?? 0,
        dismissed: data.dismiss?.length ?? 0,
        succeeded: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      }),
    });

    return { results };
  },
);
