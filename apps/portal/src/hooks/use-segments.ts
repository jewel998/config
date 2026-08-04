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
import { writeAuditEntry } from "@/lib/audit";
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
      // Audit entry — best effort, don't block segment creation
      try {
        await writeAuditEntry(projectId, {
          actorId: user.uid,
          timestamp: new Date().toISOString(),
          action: "create",
          resourcePath: `segments/${segment.name}`,
          newValue: JSON.stringify(data),
        });
      } catch {
        // Audit failure should not block the operation
      }
      return docRef.id;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["segments", variables.projectId],
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
      await writeAuditEntry(projectId, {
        actorId: user.uid,
        timestamp: new Date().toISOString(),
        action: "update",
        resourcePath: `segments/${segmentId}`,
        oldValue: oldData ? JSON.stringify(oldData) : undefined,
        newValue: JSON.stringify(data),
      });
      const docRef = doc(db, "projects", projectId, "segments", segmentId);
      await updateDoc(docRef, { ...data, updatedAt: new Date().toISOString() });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["segments", variables.projectId],
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
    }: {
      projectId: string;
      segmentId: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      await writeAuditEntry(projectId, {
        actorId: user.uid,
        timestamp: new Date().toISOString(),
        action: "delete",
        resourcePath: `segments/${segmentId}`,
      });
      await deleteDoc(doc(db, "projects", projectId, "segments", segmentId));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["segments", variables.projectId],
      });
    },
  });
};
