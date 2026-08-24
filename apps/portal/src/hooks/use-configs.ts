import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";
import { useMemo } from "react";

import {
  ConfigRepository,
  type ConfigCreateInput,
  type ConfigUpdateInput,
} from "@/dao/config.repository";
import { db } from "@/lib/firebase";
import { type ConfigEntry, configKeySchema, configValueSchema } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";

export type { ConfigEntry };
export { configKeySchema, configValueSchema };

export const useConfigs = (projectId: string | null, environmentId: string | null) => {
  return useQuery({
    queryKey: ["configs", projectId, environmentId],
    queryFn: async () => {
      if (!projectId || !environmentId) return [];
      const colRef = collection(
        db,
        "projects",
        projectId,
        "environments",
        environmentId,
        "configs",
      );
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map((d) => ({
        key: d.id,
        ...d.data(),
      })) as ConfigEntry[];
    },
    enabled: !!projectId && !!environmentId,
  });
};

export const useSetConfig = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const repo = useMemo(() => new ConfigRepository(db, queryClient), [queryClient]);

  return useMutation({
    mutationFn: async ({
      projectId,
      environmentId,
      key,
      value,
      valueType,
    }: {
      projectId: string;
      environmentId: string;
      key: string;
      value: unknown;
      valueType: ConfigEntry["valueType"];
    }) => {
      if (!user) throw new Error("Not authenticated");
      const ctx = { projectId, environmentId };
      const authUser = { uid: user.uid, email: user.email };
      const input: ConfigCreateInput = { key, value, valueType };
      await repo.create(input, ctx, authUser);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["configs", variables.projectId, variables.environmentId],
      });
      queryClient.invalidateQueries({
        queryKey: ["audit_log", variables.projectId],
      });
    },
  });
};

export const useDeleteConfig = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const repo = useMemo(() => new ConfigRepository(db, queryClient), [queryClient]);

  return useMutation({
    mutationFn: async ({
      projectId,
      environmentId,
      key,
    }: {
      projectId: string;
      environmentId: string;
      key: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const ctx = { projectId, environmentId };
      const authUser = { uid: user.uid, email: user.email };
      await repo.delete(key, ctx, authUser);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["configs", variables.projectId, variables.environmentId],
      });
      queryClient.invalidateQueries({
        queryKey: ["audit_log", variables.projectId],
      });
    },
  });
};

export const usePromoteConfigs = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const repo = useMemo(() => new ConfigRepository(db, queryClient), [queryClient]);

  return useMutation({
    mutationFn: async ({
      projectId,
      targetEnvId,
      configs,
    }: {
      projectId: string;
      targetEnvId: string;
      configs: Array<{
        key: string;
        value: unknown;
        valueType: ConfigEntry["valueType"];
      }>;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const ctx = { projectId, environmentId: targetEnvId };
      const authUser = { uid: user.uid, email: user.email };

      const inputs: ConfigCreateInput[] = configs.map((c) => ({
        key: c.key,
        value: c.value,
        valueType: c.valueType,
      }));

      const result = await repo.batchCreate(inputs, ctx, authUser);
      return result.succeeded.length;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["configs", variables.projectId, variables.targetEnvId],
      });
      queryClient.invalidateQueries({
        queryKey: ["audit_log", variables.projectId],
      });
    },
  });
};

export const useToggleConfigLock = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const repo = useMemo(() => new ConfigRepository(db, queryClient), [queryClient]);

  return useMutation({
    mutationFn: async ({
      projectId,
      environmentId,
      key,
      locked,
    }: {
      projectId: string;
      environmentId: string;
      key: string;
      locked: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const ctx = { projectId, environmentId };
      const authUser = { uid: user.uid, email: user.email };
      const input: ConfigUpdateInput = { locked, _allowLockedOverride: true };
      await repo.update(key, input, ctx, authUser);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["configs", variables.projectId, variables.environmentId],
      });
      queryClient.invalidateQueries({
        queryKey: ["audit_log", variables.projectId],
      });
    },
  });
};
