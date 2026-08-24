import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";
import { useMemo } from "react";

import {
  ApiKeyRepository,
  type ApiKeyCreateInput,
  type ApiKeyUpdateInput,
} from "@/dao/api-key.repository";
import { db } from "@/lib/firebase";
import type { ApiKey } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";

export type { ApiKey };

type ApiKeyType = "client" | "server";

export const useApiKeys = (projectId: string | null, environmentId: string | null) => {
  return useQuery({
    queryKey: ["apiKeys", projectId, environmentId],
    queryFn: async () => {
      if (!projectId || !environmentId) return [];
      const colRef = collection(
        db,
        "projects",
        projectId,
        "environments",
        environmentId,
        "clientIds",
      );
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map((d) => d.data() as ApiKey);
    },
    enabled: !!projectId && !!environmentId,
  });
};

export const useGenerateApiKey = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const repo = useMemo(() => new ApiKeyRepository(db, queryClient), [queryClient]);

  return useMutation({
    mutationFn: async ({
      projectId,
      environmentId,
      label,
      keyType = "client",
    }: {
      projectId: string;
      environmentId: string;
      label?: string;
      keyType?: ApiKeyType;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const ctx = { projectId, environmentId };
      const authUser = { uid: user.uid, email: user.email };
      const input: ApiKeyCreateInput = {
        label: label ?? "",
        type: keyType,
      };
      const entity = await repo.create(input, ctx, authUser);
      // Return as ApiKey for backward compat
      return {
        token: entity.token,
        status: entity.status,
        type: entity.type,
        label: entity.label,
        createdAt: entity.createdAt,
        revokedAt: entity.revokedAt,
        createdBy: entity.createdBy,
      } as ApiKey;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["apiKeys", variables.projectId, variables.environmentId],
      });
      queryClient.invalidateQueries({
        queryKey: ["audit_log", variables.projectId],
      });
    },
  });
};

export const useRevokeApiKey = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const repo = useMemo(() => new ApiKeyRepository(db, queryClient), [queryClient]);

  return useMutation({
    mutationFn: async ({
      projectId,
      environmentId,
      token,
      label: _label,
    }: {
      projectId: string;
      environmentId: string;
      token: string;
      label?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const ctx = { projectId, environmentId };
      const authUser = { uid: user.uid, email: user.email };
      const input: ApiKeyUpdateInput = {
        status: "revoked",
        revokedAt: new Date().toISOString(),
      };
      await repo.update(token, input, ctx, authUser);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["apiKeys", variables.projectId, variables.environmentId],
      });
      queryClient.invalidateQueries({
        queryKey: ["audit_log", variables.projectId],
      });
    },
  });
};

export const useDeleteApiKey = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const repo = useMemo(() => new ApiKeyRepository(db, queryClient), [queryClient]);

  return useMutation({
    mutationFn: async ({
      projectId,
      environmentId,
      token,
      label: _label,
    }: {
      projectId: string;
      environmentId: string;
      token: string;
      label?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const ctx = { projectId, environmentId };
      const authUser = { uid: user.uid, email: user.email };
      await repo.delete(token, ctx, authUser);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["apiKeys", variables.projectId, variables.environmentId],
      });
      queryClient.invalidateQueries({
        queryKey: ["audit_log", variables.projectId],
      });
    },
  });
};
