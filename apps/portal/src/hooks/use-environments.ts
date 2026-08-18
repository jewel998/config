import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";
import { useMemo } from "react";

import { db } from "@/lib/firebase";
import { useAuthStore } from "@/stores/auth-store";
import type { Environment } from "@/lib/types";
import {
  EnvironmentRepository,
  type EnvironmentCreateInput,
  type EnvironmentUpdateInput,
} from "@/dao/environment.repository";

export type { Environment };

export const useEnvironments = (projectId: string | null) => {
  return useQuery({
    queryKey: ["environments", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const envCollection = collection(
        db,
        "projects",
        projectId,
        "environments",
      );
      const snapshot = await getDocs(envCollection);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Environment, "id">),
      })) as Environment[];
    },
    enabled: !!projectId,
  });
};

export const useCreateEnvironment = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const repo = useMemo(
    () => new EnvironmentRepository(db, queryClient),
    [queryClient],
  );

  return useMutation({
    mutationFn: async ({
      projectId,
      name,
      allowedDomains,
      color,
      isProduction,
    }: {
      projectId: string;
      name: string;
      allowedDomains: string[];
      color?: string;
      isProduction?: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const ctx = { projectId };
      const authUser = { uid: user.uid, email: user.email };
      const input: EnvironmentCreateInput = {
        name: name.trim(),
        allowedDomains,
        color,
        isProduction: isProduction ?? false,
      };
      await repo.create(input, ctx, authUser);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["environments", variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["audit_log", variables.projectId],
      });
    },
  });
};

export const useDeleteEnvironment = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const repo = useMemo(
    () => new EnvironmentRepository(db, queryClient),
    [queryClient],
  );

  return useMutation({
    mutationFn: async ({
      projectId,
      envId,
      envName: _envName,
    }: {
      projectId: string;
      envId: string;
      envName?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const ctx = { projectId };
      const authUser = { uid: user.uid, email: user.email };
      await repo.delete(envId, ctx, authUser);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["environments", variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["audit_log", variables.projectId],
      });
    },
  });
};

export const useUpdateEnvironment = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const repo = useMemo(
    () => new EnvironmentRepository(db, queryClient),
    [queryClient],
  );

  return useMutation({
    mutationFn: async ({
      projectId,
      envId,
      envName: _envName,
      data,
    }: {
      projectId: string;
      envId: string;
      envName?: string;
      data: Partial<{
        name: string;
        allowedDomains: string[];
        color: string;
        isProduction: boolean;
      }>;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const ctx = { projectId };
      const authUser = { uid: user.uid, email: user.email };
      const input: EnvironmentUpdateInput = { ...data };
      await repo.update(envId, input, ctx, authUser);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["environments", variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["audit_log", variables.projectId],
      });
    },
  });
};
