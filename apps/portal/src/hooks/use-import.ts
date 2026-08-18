import { useMutation, useQueryClient } from "@tanstack/react-query";
import { httpsCallable } from "firebase/functions";
import { doc, onSnapshot } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";

import { db, functions } from "@/lib/firebase";
import type {
  ImportJob,
  FailedRowDoc,
  ConflictStrategy,
  ImportEntry,
} from "@/lib/types";

// ─── Import Configs Mutation ─────────────────────────────────

interface ImportConfigsArgs {
  projectId: string;
  environmentId: string;
  entries: ImportEntry[];
  conflictStrategy: ConflictStrategy;
  reviewDecisions?: Record<string, "accept" | "reject">;
}

interface ImportConfigsResult {
  jobId: string;
  status: "processing" | "completed" | "failed";
}

export const useImportConfigs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      args: ImportConfigsArgs,
    ): Promise<ImportConfigsResult> => {
      const callable = httpsCallable<ImportConfigsArgs, ImportConfigsResult>(
        functions,
        "importConfigs",
      );
      const result = await callable(args);
      return result.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["configs", variables.projectId, variables.environmentId],
      });
      queryClient.invalidateQueries({
        queryKey: ["audit_log", variables.projectId],
      });
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 4000),
  });
};

// ─── Import Job Real-time Listener ───────────────────────────

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

const FAILED_ROWS_PAGE_SIZE = 50;

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

      const { collection, query, orderBy, limit, startAfter, getDocs } =
        await import("firebase/firestore");
      const colRef = collection(
        db,
        "projects",
        projectId,
        "import_jobs",
        jobId,
        "failed_rows",
      );

      let q = query(
        colRef,
        orderBy("rowNumber"),
        limit(FAILED_ROWS_PAGE_SIZE + 1),
      );
      if (startAfterDoc) {
        q = query(
          colRef,
          orderBy("rowNumber"),
          startAfter(startAfterDoc),
          limit(FAILED_ROWS_PAGE_SIZE + 1),
        );
      }

      const snap = await getDocs(q);
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

// ─── Retry Failed Rows Mutation ──────────────────────────────

interface RetryArgs {
  projectId: string;
  jobId: string;
  entries: Array<{
    rowId: string;
    key: string;
    value: unknown;
    valueType: string;
  }>;
  dismiss?: string[];
}

interface RetryResult {
  results: Array<{ rowId: string; success: boolean; error?: string }>;
}

export const useRetryFailedRows = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: RetryArgs): Promise<RetryResult> => {
      const callable = httpsCallable<RetryArgs, RetryResult>(
        functions,
        "retryFailedRows",
      );
      const result = await callable(args);
      return result.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["import_job", variables.projectId, variables.jobId],
      });
    },
  });
};
