import { useQuery } from "@tanstack/react-query";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
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
      let q = query(
        collection(db, "projects", projectId, "audit_log"),
        orderBy("timestamp", "desc"),
        limit(filters?.limit ?? 50),
      );
      if (filters?.action) {
        q = query(q, where("action", "==", filters.action));
      }
      const snapshot = await getDocs(q);
      return snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as AuditEntry,
      );
    },
    enabled: !!projectId,
  });
};
