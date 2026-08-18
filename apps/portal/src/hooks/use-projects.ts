import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  query,
  where,
  getDocs,
  limit as firestoreLimit,
} from "firebase/firestore";
import { useMemo } from "react";

import { db } from "@/lib/firebase";
import type { Project } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";
import {
  ProjectRepository,
  type ProjectCreateInput,
} from "@/dao/project.repository";

export type { Project };

export const useProjects = () => {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["projects", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const q = query(
        collection(db, "projects"),
        where("authorizedUsers", "array-contains", user.uid),
        firestoreLimit(50),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs
        .filter((d) => !d.data().deletedAt)
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Project, "id">),
        }));
    },
    enabled: !!user,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const repo = useMemo(
    () => new ProjectRepository(db, queryClient),
    [queryClient],
  );

  return useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error("Not authenticated");
      // ProjectRepository needs a projectId in ctx for audit writing.
      // For new projects, we use a temp value; the actual ID comes from Firestore.
      // We'll use the repository's create which writes audit to projects/{projectId}/audit_log.
      // Since the project doesn't exist yet, we pass a placeholder and
      // the base repo will use it.
      const ctx = { projectId: "new" };
      const authUser = { uid: user.uid, email: user.email };
      const input: ProjectCreateInput = { name };
      const entity = await repo.create(input, ctx, authUser);
      return entity.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const repo = useMemo(
    () => new ProjectRepository(db, queryClient),
    [queryClient],
  );

  return useMutation({
    mutationFn: async ({
      projectId,
      projectName: _projectName,
    }: {
      projectId: string;
      projectName?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const ctx = { projectId };
      const authUser = { uid: user.uid, email: user.email };
      await repo.softDelete(projectId, ctx, authUser);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
};
