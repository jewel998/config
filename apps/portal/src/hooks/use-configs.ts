import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import {
  type ConfigEntry,
  configKeySchema,
  configValueSchema,
} from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";
import { writeAuditEntry, buildConfigAuditEntry } from "@/lib/audit";

export type { ConfigEntry };
export { configKeySchema, configValueSchema };

export const useConfigs = (
  projectId: string | null,
  environmentId: string | null,
) => {
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

      // Write audit entry for config creation/update
      await writeAuditEntry(
        projectId,
        buildConfigAuditEntry({
          actorId: user.uid,
          action: "create",
          environmentId,
          configKey: key,
          newValue: { key, value, valueType },
        }),
      );

      const docRef = doc(
        db,
        "projects",
        projectId,
        "environments",
        environmentId,
        "configs",
        key,
      );
      await setDoc(
        docRef,
        {
          key,
          value,
          valueType,
          version: "1",
          publishedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          updatedBy: user.uid,
        },
        { merge: true },
      );
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

      // Write audit entry for config deletion
      await writeAuditEntry(
        projectId,
        buildConfigAuditEntry({
          actorId: user.uid,
          action: "delete",
          environmentId,
          configKey: key,
        }),
      );

      await deleteDoc(
        doc(
          db,
          "projects",
          projectId,
          "environments",
          environmentId,
          "configs",
          key,
        ),
      );
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
      const batch = configs.map(async (config) => {
        const docRef = doc(
          db,
          "projects",
          projectId,
          "environments",
          targetEnvId,
          "configs",
          config.key,
        );
        await setDoc(
          docRef,
          {
            key: config.key,
            value: config.value,
            valueType: config.valueType,
            version: "1",
            publishedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            updatedBy: user.uid,
          },
          { merge: true },
        );
      });
      await Promise.all(batch);
      return configs.length;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["configs", variables.projectId, variables.targetEnvId],
      });
    },
  });
};

export const useToggleConfigLock = () => {
  const queryClient = useQueryClient();
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
      const docRef = doc(
        db,
        "projects",
        projectId,
        "environments",
        environmentId,
        "configs",
        key,
      );
      await updateDoc(docRef, { locked, updatedAt: new Date().toISOString() });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["configs", variables.projectId, variables.environmentId],
      });
    },
  });
};
