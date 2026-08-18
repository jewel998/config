import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";
import { useMemo } from "react";

import { db } from "@/lib/firebase";
import type { Segment } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";
import {
  SegmentRepository,
  type SegmentCreateInput,
  type SegmentUpdateInput,
} from "@/dao/segment.repository";

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
  const repo = useMemo(
    () => new SegmentRepository(db, queryClient),
    [queryClient],
  );

  return useMutation({
    mutationFn: async ({
      projectId,
      segment,
    }: {
      projectId: string;
      segment: Omit<Segment, "id" | "createdAt" | "updatedAt" | "createdBy">;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const ctx = { projectId };
      const authUser = { uid: user.uid, email: user.email };
      const input: SegmentCreateInput = {
        name: segment.name,
        description: segment.description,
        conditions: segment.conditions,
      };
      const entity = await repo.create(input, ctx, authUser);
      return entity.id;
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
  const repo = useMemo(
    () => new SegmentRepository(db, queryClient),
    [queryClient],
  );

  return useMutation({
    mutationFn: async ({
      projectId,
      segmentId,
      data,
      oldData: _oldData,
    }: {
      projectId: string;
      segmentId: string;
      data: Partial<Segment>;
      oldData?: Segment;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const ctx = { projectId };
      const authUser = { uid: user.uid, email: user.email };
      const input: SegmentUpdateInput = {};
      if (data.name !== undefined) input.name = data.name;
      if (data.description !== undefined) input.description = data.description;
      if (data.conditions !== undefined) input.conditions = data.conditions;
      await repo.update(segmentId, input, ctx, authUser);
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
  const repo = useMemo(
    () => new SegmentRepository(db, queryClient),
    [queryClient],
  );

  return useMutation({
    mutationFn: async ({
      projectId,
      segmentId,
      segmentName: _segmentName,
    }: {
      projectId: string;
      segmentId: string;
      segmentName?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const ctx = { projectId };
      const authUser = { uid: user.uid, email: user.email };
      await repo.delete(segmentId, ctx, authUser);
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
