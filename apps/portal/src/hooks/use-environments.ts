import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { writeAuditEntry, buildAuditEntry } from "@/lib/audit";
import { useAuthStore } from "@/stores/auth-store";
import type { Environment } from "@/lib/types";

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
      const envCollection = collection(
        db,
        "projects",
        projectId,
        "environments",
      );
      await addDoc(envCollection, {
        name: name.trim(),
        projectId,
        allowedDomains,
        color: color || undefined,
        isProduction: isProduction || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      try {
        await writeAuditEntry(
          projectId,
          buildAuditEntry({
            actorId: user.uid,
            action: "create",
            resourcePath: `environments/${name.trim()}`,
            newValue: {
              name: name.trim(),
              isProduction: isProduction || false,
            },
          }),
        );
      } catch {
        /* best-effort */
      }
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

  return useMutation({
    mutationFn: async ({
      projectId,
      envId,
      envName,
    }: {
      projectId: string;
      envId: string;
      envName?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      await deleteDoc(doc(db, "projects", projectId, "environments", envId));
      try {
        await writeAuditEntry(
          projectId,
          buildAuditEntry({
            actorId: user.uid,
            action: "delete",
            resourcePath: `environments/${envName || envId}`,
          }),
        );
      } catch {
        /* best-effort */
      }
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

  return useMutation({
    mutationFn: async ({
      projectId,
      envId,
      envName,
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
      const envRef = doc(db, "projects", projectId, "environments", envId);
      await updateDoc(envRef, { ...data, updatedAt: new Date().toISOString() });
      try {
        await writeAuditEntry(
          projectId,
          buildAuditEntry({
            actorId: user.uid,
            action: "update",
            resourcePath: `environments/${envName || envId}`,
            newValue: data,
          }),
        );
      } catch {
        /* best-effort */
      }
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
