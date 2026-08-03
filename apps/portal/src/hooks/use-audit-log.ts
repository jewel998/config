import { useQuery } from "@tanstack/react-query";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  type QueryConstraint,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { AuditEntry } from "@/lib/types";

export const useAuditLog = (
  projectId: string | null,
  filters?: { action?: string; configKey?: string; limit?: number },
) => {
  return useQuery({
    queryKey: ["audit_log", projectId, filters],
    queryFn: async () => {
      if (!projectId) return [];

      const constraints: QueryConstraint[] = [];

      // Add where clause BEFORE orderBy (Firestore requirement)
      if (filters?.action) {
        constraints.push(where("action", "==", filters.action));
      }

      constraints.push(orderBy("timestamp", "desc"));
      constraints.push(limit(filters?.limit ?? 50));

      const q = query(
        collection(db, "projects", projectId, "audit_log"),
        ...constraints,
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as AuditEntry,
      );
    },
    enabled: !!projectId,
  });
};
