import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { writeAuditEntry, buildAuditEntry } from "@/lib/audit";
import type { Segment } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";

export const useSegments = (projectId: string | null) => {
  return useQuery({
    queryKey: ["segments", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const colRef = collection(db, "projects", projectId, "segments");
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Segment);
    },
    enabled: !!projectId,
  });
};

export const useCreateSegment = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      projectId,
      segment,
    }: {
      projectId: string;
      segment: Omit<Segment, "id" | "createdAt" | "updatedAt" | "createdBy">;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const data = {
        ...segment,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user.uid,
      };
      const colRef = collection(db, "projects", projectId, "segments");
      const docRef = await addDoc(colRef, data);
      try {
        await writeAuditEntry(
          projectId,
          buildAuditEntry({
            actorId: user.uid,
            action: "create",
            resourcePath: `segments/${segment.name}`,
            newValue: data,
          }),
        );
      } catch {
        /* best-effort */
      }
      return docRef.id;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["segments", variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["audit_log", variables.projectId],
      });
    },
  });
};

export const useUpdateSegment = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      projectId,
      segmentId,
      data,
      oldData,
    }: {
      projectId: string;
      segmentId: string;
      data: Partial<Segment>;
      oldData?: Segment;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const segmentName = data.name || oldData?.name || segmentId;
      await writeAuditEntry(
        projectId,
        buildAuditEntry({
          actorId: user.uid,
          action: "update",
          resourcePath: `segments/${segmentName}`,
          oldValue: oldData,
          newValue: data,
        }),
      );
      const docRef = doc(db, "projects", projectId, "segments", segmentId);
      await updateDoc(docRef, { ...data, updatedAt: new Date().toISOString() });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["segments", variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["audit_log", variables.projectId],
      });
    },
  });
};

export const useDeleteSegment = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      projectId,
      segmentId,
      segmentName,
    }: {
      projectId: string;
      segmentId: string;
      segmentName?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      await writeAuditEntry(
        projectId,
        buildAuditEntry({
          actorId: user.uid,
          action: "delete",
          resourcePath: `segments/${segmentName || segmentId}`,
        }),
      );
      await deleteDoc(doc(db, "projects", projectId, "segments", segmentId));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["segments", variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["audit_log", variables.projectId],
      });
    },
  });
};
