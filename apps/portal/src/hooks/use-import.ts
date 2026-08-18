import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";

import { db } from "@/lib/firebase";
import { bumpConfigVersion } from "@/lib/bump-version";
import { writeAuditEntry, buildConfigAuditEntry } from "@/lib/audit";
import type { ImportEntryFull } from "@/lib/import-types";
import type { ImportJob, FailedRowDoc, ConflictStrategy } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";
import { useImportWizardStore } from "@/stores/import-wizard-store";
import { ConfigRepository } from "@/dao/config.repository";
import type { ConfigCreateInput } from "@/dao/config.repository";

// ─── Constants ───────────────────────────────────────────────

const MAX_BATCH_SIZE = 500;
const FAILED_ROWS_PAGE_SIZE = 50;

// ─── Import Configs (uses ConfigRepository.batchCreate) ──────

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
  const setImportResult = useImportWizardStore((s) => s.setImportResult);

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

      // Convert entries to ConfigCreateInput for the repository
      const createInputs: ConfigCreateInput[] = toWrite.map((entry) => ({
        key: entry.key,
        value: entry.value,
        valueType: entry.valueType,
        ...(entry.lifecycleState
          ? { lifecycleState: entry.lifecycleState }
          : {}),
        ...(entry.targetingRules
          ? { targetingRules: entry.targetingRules }
          : {}),
        ...(entry.rolloutPercentage !== undefined
          ? { rolloutPercentage: entry.rolloutPercentage }
          : {}),
        ...(entry.rolloutValue !== undefined
          ? { rolloutValue: entry.rolloutValue }
          : {}),
        ...(entry.overrides ? { overrides: entry.overrides } : {}),
        ...(entry.schedule ? { schedule: entry.schedule } : {}),
        ...(entry.prerequisites ? { prerequisites: entry.prerequisites } : {}),
      }));

      // Use ConfigRepository.batchCreate for the write operation
      const repo = new ConfigRepository(db, queryClient);
      const ctx = { projectId, environmentId };
      const authUser = { uid: user.uid, email: user.email };
      const batchResult = await repo.batchCreate(createInputs, ctx, authUser);

      // Map failed results back to the expected format
      for (const fail of batchResult.failed) {
        const key = (fail.input as ConfigCreateInput).key ?? "unknown";
        const reason = fail.errors.map((e) => e.message).join("; ");
        failedEntries.push({ key, reason });
      }

      const result: ImportResult = {
        succeeded: batchResult.succeeded.length,
        failed: failedEntries.length,
        skipped,
        failedEntries,
      };

      // Store result in the Zustand store for ResultsStep
      setImportResult(result);

      return result;
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
