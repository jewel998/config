import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";

import { db } from "@/lib/firebase";
import { bumpConfigVersion } from "@/lib/bump-version";
import { writeAuditEntry, buildConfigAuditEntry } from "@/lib/audit";
import type { ImportEntryFull } from "@/lib/import-types";
import type { ImportJob, FailedRowDoc, ConflictStrategy } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";

// ─── Constants ───────────────────────────────────────────────

const MAX_BATCH_SIZE = 500;
const FAILED_ROWS_PAGE_SIZE = 50;

// ─── Import Configs (Direct Firestore Write) ─────────────────

interface ImportConfigsArgs {
  projectId: string;
  environmentId: string;
  entries: ImportEntryFull[];
  conflictStrategy: ConflictStrategy;
  reviewDecisions?: Record<string, "accept" | "reject">;
}

interface ImportResult {
  succeeded: number;
  failed: number;
  skipped: number;
  failedEntries: Array<{ key: string; reason: string }>;
}

export const useImportConfigs = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (args: ImportConfigsArgs): Promise<ImportResult> => {
      if (!user) throw new Error("Not authenticated");

      const {
        projectId,
        environmentId,
        entries,
        conflictStrategy,
        reviewDecisions,
      } = args;
      const now = new Date().toISOString();

      // Load existing configs to detect conflicts
      const configsColRef = collection(
        db,
        "projects",
        projectId,
        "environments",
        environmentId,
        "configs",
      );
      const existingSnap = await getDocs(configsColRef);
      const existingConfigs = new Map<string, { locked?: boolean }>();
      existingSnap.docs.forEach((d) => {
        existingConfigs.set(d.id, { locked: d.data().locked ?? false });
      });

      // Resolve conflicts and build write list
      const toWrite: ImportEntryFull[] = [];
      let skipped = 0;
      const failedEntries: Array<{ key: string; reason: string }> = [];

      for (const entry of entries) {
        const existing = existingConfigs.get(entry.key);
        if (existing) {
          // Locked config — fail
          if (existing.locked) {
            failedEntries.push({ key: entry.key, reason: "config is locked" });
            continue;
          }

          switch (conflictStrategy) {
            case "skip":
              skipped++;
              continue;
            case "overwrite":
              toWrite.push(entry);
              break;
            case "review": {
              const decision = reviewDecisions?.[entry.key];
              if (decision === "accept") {
                toWrite.push(entry);
              } else {
                skipped++;
              }
              break;
            }
          }
        } else {
          toWrite.push(entry);
        }
      }

      // Batched writes (max 500 per batch)
      let succeeded = 0;
      for (let i = 0; i < toWrite.length; i += MAX_BATCH_SIZE) {
        const batchEntries = toWrite.slice(i, i + MAX_BATCH_SIZE);
        const batch = writeBatch(db);

        for (const entry of batchEntries) {
          const configRef = doc(
            db,
            "projects",
            projectId,
            "environments",
            environmentId,
            "configs",
            entry.key,
          );

          const data: Record<string, unknown> = {
            key: entry.key,
            value: entry.value,
            valueType: entry.valueType,
            version: "1",
            publishedAt: now,
            updatedAt: now,
            updatedBy: user.uid,
          };

          // Advanced fields (only written if provided)
          if (entry.lifecycleState) {
            data.lifecycleState = entry.lifecycleState;
            data.stateChangedAt = now;
          }
          if (entry.targetingRules) data.targetingRules = entry.targetingRules;
          if (entry.rolloutPercentage !== undefined)
            data.rolloutPercentage = entry.rolloutPercentage;
          if (entry.rolloutValue !== undefined)
            data.rolloutValue = entry.rolloutValue;
          if (entry.overrides) data.overrides = entry.overrides;
          if (entry.schedule) data.schedule = entry.schedule;
          if (entry.prerequisites) data.prerequisites = entry.prerequisites;

          batch.set(configRef, data, { merge: true });
        }

        try {
          await batch.commit();
          succeeded += batchEntries.length;
        } catch (error) {
          for (const entry of batchEntries) {
            failedEntries.push({
              key: entry.key,
              reason: error instanceof Error ? error.message : "Write failed",
            });
          }
        }
      }

      // Bump config version
      if (succeeded > 0) {
        const changedKeys = toWrite.slice(0, succeeded).map((e) => e.key);
        await bumpConfigVersion(projectId, environmentId, changedKeys);
      }

      // Write audit log
      try {
        await writeAuditEntry(
          projectId,
          buildConfigAuditEntry({
            actorId: user.uid,
            action: "create",
            environmentId,
            configKey: `bulk_import (${succeeded} entries)`,
            newValue: {
              total: entries.length,
              succeeded,
              failed: failedEntries.length,
              skipped,
              conflictStrategy,
            },
          }),
        );
      } catch {
        /* best-effort audit */
      }

      return {
        succeeded,
        failed: failedEntries.length,
        skipped,
        failedEntries,
      };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["configs", variables.projectId, variables.environmentId],
      });
      queryClient.invalidateQueries({
        queryKey: ["audit_log", variables.projectId],
      });
    },
  });
};

// ─── Import Job Real-time Listener (kept for backward compat) ─

export const useImportJob = (
  projectId: string | null,
  jobId: string | null,
) => {
  const [job, setJob] = useState<ImportJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!projectId || !jobId) {
      setJob(null);
      setIsLoading(false);
      return;
    }

    const docRef = doc(db, "projects", projectId, "import_jobs", jobId);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setJob({ id: snap.id, ...snap.data() } as ImportJob);
      } else {
        setJob(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, jobId]);

  return { job, isLoading };
};

// ─── Failed Rows Paginated Query ─────────────────────────────

export const useFailedRows = (
  projectId: string | null,
  jobId: string | null,
) => {
  const [rows, setRows] = useState<FailedRowDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<unknown>(null);

  const loadPage = useCallback(
    async (startAfterDoc?: unknown) => {
      if (!projectId || !jobId) return;
      setIsLoading(true);

      const {
        collection: colFn,
        query: queryFn,
        orderBy: orderByFn,
        limit: limitFn,
        startAfter: startAfterFn,
        getDocs: getDocsFn,
      } = await import("firebase/firestore");

      const colRef = colFn(
        db,
        "projects",
        projectId,
        "import_jobs",
        jobId,
        "failed_rows",
      );

      let q = queryFn(
        colRef,
        orderByFn("rowNumber"),
        limitFn(FAILED_ROWS_PAGE_SIZE + 1),
      );
      if (startAfterDoc) {
        q = queryFn(
          colRef,
          orderByFn("rowNumber"),
          startAfterFn(startAfterDoc),
          limitFn(FAILED_ROWS_PAGE_SIZE + 1),
        );
      }

      const snap = await getDocsFn(q);
      const docs = snap.docs.slice(0, FAILED_ROWS_PAGE_SIZE);
      const newRows = docs.map(
        (d) => ({ id: d.id, ...d.data() }) as FailedRowDoc,
      );

      setRows((prev) => (startAfterDoc ? [...prev, ...newRows] : newRows));
      setHasMore(snap.docs.length > FAILED_ROWS_PAGE_SIZE);
      setLastDoc(docs[docs.length - 1] ?? null);
      setIsLoading(false);
    },
    [projectId, jobId],
  );

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const loadMore = () => {
    if (hasMore && lastDoc) loadPage(lastDoc);
  };

  return { rows, isLoading, hasMore, loadMore };
};
