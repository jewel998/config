import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { z } from "zod";

import { db } from "@/lib/firebase";
import { useAuthStore } from "@/stores/auth-store";

export interface ConfigEntry {
  key: string;
  value: unknown;
  valueType: "string" | "number" | "boolean" | "json" | "array";
  version: string;
  publishedAt: string;
  updatedAt: string;
  updatedBy: string;
  locked?: boolean;
}

export const configValueSchema = z.discriminatedUnion("valueType", [
  z.object({ valueType: z.literal("string"), value: z.string() }),
  z.object({ valueType: z.literal("number"), value: z.number() }),
  z.object({ valueType: z.literal("boolean"), value: z.boolean() }),
  z.object({
    valueType: z.literal("json"),
    value: z.string().refine((v) => {
      try {
        JSON.parse(v);
        return true;
      } catch {
        return false;
      }
    }, "Invalid JSON"),
  }),
  z.object({
    valueType: z.literal("array"),
    value: z.string().refine((v) => {
      try {
        const p = JSON.parse(v);
        return Array.isArray(p);
      } catch {
        return false;
      }
    }, "Must be a valid JSON array"),
  }),
]);

export const configKeySchema = z
  .string()
  .min(1, "Key is required")
  .max(100, "Key must be 100 characters or less")
  .regex(
    /^[a-zA-Z0-9._]+$/,
    "Only alphanumeric, dots, and underscores allowed",
  );

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
    },
  });
};

export const useDeleteConfig = () => {
  const queryClient = useQueryClient();

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
