import { useInfiniteQuery } from "@tanstack/react-query";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  startAfter,
  type QueryConstraint,
  type DocumentSnapshot,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { AuditEntry } from "@/lib/types";

const PAGE_SIZE = 20;

export const useAuditLog = (
  projectId: string | null,
  filters?: { action?: string; configKey?: string },
) => {
  return useInfiniteQuery({
    queryKey: ["audit_log", projectId, filters],
    queryFn: async ({ pageParam }: { pageParam: DocumentSnapshot | null }) => {
      if (!projectId) return { entries: [], lastDoc: null };

      const constraints: QueryConstraint[] = [];

      if (filters?.action) {
        constraints.push(where("action", "==", filters.action));
      }

      constraints.push(orderBy("timestamp", "desc"));

      if (pageParam) {
        constraints.push(startAfter(pageParam));
      }

      constraints.push(limit(PAGE_SIZE));

      const q = query(
        collection(db, "projects", projectId, "audit_log"),
        ...constraints,
      );

      const snapshot = await getDocs(q);
      const entries = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as AuditEntry,
      );
      const lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null;

      return { entries, lastDoc };
    },
    initialPageParam: null as DocumentSnapshot | null,
    getNextPageParam: (lastPage) => {
      if (lastPage.entries.length < PAGE_SIZE) return undefined;
      return lastPage.lastDoc;
    },
    enabled: !!projectId,
  });
};
