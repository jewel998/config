import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "../utils/firestore";
import {
  MAX_BATCH_SIZE,
  MAX_INSTANCES,
  FUNCTION_TIMEOUT_SECONDS,
} from "../utils/constants";
import { validateEntries } from "../utils/import-validator";
import type {
  ConflictRow,
  ConflictStrategy,
  ImportEntry,
  ImportJob,
  FailedRowDoc,
} from "../import-export-types";

const JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

interface ImportCallableData {
  projectId: string;
  environmentId: string;
  entries: ImportEntry[];
  conflictStrategy: ConflictStrategy;
  reviewDecisions?: Record<string, "accept" | "reject">;
}

/**
 * importConfigs — HTTPS Callable Cloud Function
 *
 * Validates, resolves conflicts, and persists bulk config entries
 * into the target environment via batched Firestore writes.
 */
export const importConfigs = onCall(
  { maxInstances: MAX_INSTANCES, timeoutSeconds: FUNCTION_TIMEOUT_SECONDS },
  async (request) => {
    // ─── Auth Check ──────────────────────────────────────────
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    const uid = request.auth.uid;

    // ─── Argument Validation ─────────────────────────────────
    const data = request.data as ImportCallableData;
    if (!data.projectId || !data.environmentId || !data.entries) {
      throw new HttpsError(
        "invalid-argument",
        "projectId, environmentId, and entries are required",
      );
    }
    if (!["skip", "overwrite", "review"].includes(data.conflictStrategy)) {
      throw new HttpsError(
        "invalid-argument",
        "conflictStrategy must be skip, overwrite, or review",
      );
    }

    const db = getDb();
    const projectRef = db.collection("projects").doc(data.projectId);

    // ─── Project & RBAC Check ────────────────────────────────
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

    // ─── Environment Check ───────────────────────────────────
    const envRef = projectRef
      .collection("environments")
      .doc(data.environmentId);
    const envSnap = await envRef.get();
    if (!envSnap.exists) {
      throw new HttpsError("not-found", "Environment not found");
    }
    const envData = envSnap.data()!;

    // Production environment requires admin
    if (envData.isProduction && userRole !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Admin role required for production imports",
      );
    }

    // ─── Concurrency Guard (transactional to prevent TOCTOU) ──
    const jobRef = await db.runTransaction(async (transaction) => {
      const existingJobs = await transaction.get(
        projectRef
          .collection("import_jobs")
          .where("environmentId", "==", data.environmentId)
          .where("status", "==", "processing")
          .limit(1),
      );

      if (!existingJobs.empty) {
        throw new HttpsError(
          "already-exists",
          "Another import is in progress for this environment",
        );
      }

      const newJobRef = projectRef.collection("import_jobs").doc();
      return newJobRef;
    });

    // ─── Server-side Validation ──────────────────────────────
    const rawEntries = data.entries.map((e) => ({
      key: e.key,
      value: e.value,
      valueType: e.valueType,
    }));
    const validationResult = validateEntries(rawEntries);

    // ─── Conflict Detection ──────────────────────────────────
    const configsCol = envRef.collection("configs");
    const existingConfigsSnap = await configsCol.get();
    const existingConfigs = new Map<
      string,
      { value: unknown; valueType: string; locked: boolean }
    >();
    existingConfigsSnap.docs.forEach((doc) => {
      const d = doc.data();
      existingConfigs.set(doc.id, {
        value: d.value,
        valueType: d.valueType,
        locked: d.locked ?? false,
      });
    });

    const conflicts: ConflictRow[] = [];
    const nonConflicting: ImportEntry[] = [];

    for (let i = 0; i < validationResult.valid.length; i++) {
      const entry = validationResult.valid[i];
      const existing = existingConfigs.get(entry.key);
      if (existing) {
        conflicts.push({
          rowNumber: i + 1,
          entry,
          existingValue: existing.value,
          existingValueType: existing.valueType,
          isLocked: existing.locked,
        });
      } else {
        nonConflicting.push(entry);
      }
    }

    // ─── Create Import Job ───────────────────────────────────
    const now = new Date().toISOString();
    const totalRows =
      nonConflicting.length + conflicts.length + validationResult.failed.length;

    const jobData: ImportJob = {
      id: jobRef.id,
      projectId: data.projectId,
      environmentId: data.environmentId,
      status: "processing",
      totalRows,
      processedRows: 0,
      succeededCount: 0,
      failedCount: validationResult.failed.length,
      skippedCount: 0,
      dismissedCount: 0,
      conflictStrategy: data.conflictStrategy,
      createdBy: uid,
      createdAt: now,
    };
    await jobRef.set(jobData);

    // ─── Write Failed Rows from Validation ───────────────────
    for (const failedRow of validationResult.failed) {
      const failedRef = jobRef.collection("failed_rows").doc();
      const failedDoc: FailedRowDoc = {
        id: failedRef.id,
        rowNumber: failedRow.rowNumber,
        key: String(failedRow.entry.key ?? ""),
        value: failedRow.entry.value ?? null,
        valueType: String(failedRow.entry.valueType ?? ""),
        reason: failedRow.reason,
        dismissed: false,
        createdAt: now,
      };
      await failedRef.set(failedDoc);
    }

    // ─── Resolve Conflicts ───────────────────────────────────
    const entriesToPersist: ImportEntry[] = [...nonConflicting];
    let skippedCount = 0;
    const overwriteEntries: ImportEntry[] = [];

    for (const conflict of conflicts) {
      // Locked config check
      if (conflict.isLocked && userRole !== "admin") {
        const failedRef = jobRef.collection("failed_rows").doc();
        await failedRef.set({
          id: failedRef.id,
          rowNumber: conflict.rowNumber,
          key: conflict.entry.key,
          value: conflict.entry.value,
          valueType: conflict.entry.valueType,
          reason: "config is locked",
          dismissed: false,
          createdAt: now,
        } satisfies FailedRowDoc);
        jobData.failedCount++;
        continue;
      }

      switch (data.conflictStrategy) {
        case "skip":
          skippedCount++;
          break;
        case "overwrite":
          overwriteEntries.push(conflict.entry);
          break;
        case "review": {
          const decision = data.reviewDecisions?.[conflict.entry.key];
          if (decision === "accept") {
            overwriteEntries.push(conflict.entry);
          } else {
            skippedCount++;
          }
          break;
        }
      }
    }

    // ─── Batched Persistence ─────────────────────────────────
    let succeededCount = 0;
    let processedRows = 0;
    const allEntries = [...entriesToPersist, ...overwriteEntries];
    const isOverwrite = new Set(overwriteEntries.map((e) => e.key));
    let lastProgressUpdate = Date.now();

    for (let i = 0; i < allEntries.length; i += MAX_BATCH_SIZE) {
      const batchEntries = allEntries.slice(i, i + MAX_BATCH_SIZE);
      const batch = db.batch();

      for (const entry of batchEntries) {
        const configRef = configsCol.doc(entry.key);

        // If overwriting a locked config as admin, unlock it
        if (isOverwrite.has(entry.key)) {
          const existing = existingConfigs.get(entry.key);
          if (existing?.locked && userRole === "admin") {
            batch.update(configRef, { locked: false });
          }
        }

        batch.set(
          configRef,
          {
            key: entry.key,
            value: entry.value,
            valueType: entry.valueType,
            version: "1",
            publishedAt: now,
            updatedAt: now,
            updatedBy: uid,
          },
          { merge: true },
        );
      }

      try {
        await batch.commit();
        succeededCount += batchEntries.length;
      } catch (error) {
        // Record per-entry failures for this batch
        for (const entry of batchEntries) {
          const failedRef = jobRef.collection("failed_rows").doc();
          await failedRef.set({
            id: failedRef.id,
            rowNumber: 0,
            key: entry.key,
            value: entry.value,
            valueType: entry.valueType,
            reason:
              error instanceof Error ? error.message : "Firestore write error",
            dismissed: false,
            createdAt: now,
          } satisfies FailedRowDoc);
        }
        jobData.failedCount += batchEntries.length;
      }

      processedRows += batchEntries.length;

      // Update progress at least every 5 seconds
      if (Date.now() - lastProgressUpdate >= 5000) {
        await jobRef.update({ processedRows });
        lastProgressUpdate = Date.now();
      }
    }

    // ─── Write Audit Log ─────────────────────────────────────
    const auditRef = projectRef.collection("audit_log").doc();
    await auditRef.set({
      action: "bulk_import",
      actorId: uid,
      timestamp: now,
      resourcePath: `environments/${data.environmentId}`,
      newValue: JSON.stringify({
        totalRows,
        succeeded: succeededCount,
        failed: jobData.failedCount,
        skipped: skippedCount,
        conflictStrategy: data.conflictStrategy,
      }),
    });

    // ─── For overwrites, write old→new audit entries ─────────
    if (overwriteEntries.length > 0) {
      for (const entry of overwriteEntries) {
        const existing = existingConfigs.get(entry.key);
        if (existing) {
          const overwriteAuditRef = projectRef.collection("audit_log").doc();
          await overwriteAuditRef.set({
            action: "update",
            actorId: uid,
            timestamp: now,
            resourcePath: `environments/${data.environmentId}/configs/${entry.key}`,
            oldValue: JSON.stringify({
              value: existing.value,
              valueType: existing.valueType,
            }),
            newValue: JSON.stringify({
              value: entry.value,
              valueType: entry.valueType,
            }),
          });
        }
      }
    }

    // ─── Finalize Job ────────────────────────────────────────
    const finalStatus = jobData.failedCount > 0 ? "completed" : "completed";
    await jobRef.update({
      status: finalStatus,
      processedRows: totalRows,
      succeededCount,
      failedCount: jobData.failedCount,
      skippedCount,
      completedAt: new Date().toISOString(),
    });

    return { jobId: jobRef.id, status: "completed" };
  },
);
