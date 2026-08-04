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
import type { ApiKey } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";
import { writeAuditEntry, buildAuditEntry } from "@/lib/audit";

export type { ApiKey };

const generateToken = (): string => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return "cid_" + Array.from(bytes, (b) => chars[b % chars.length]).join("");
};

export const useApiKeys = (
  projectId: string | null,
  environmentId: string | null,
) => {
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

  return useMutation({
    mutationFn: async ({
      projectId,
      environmentId,
      label,
    }: {
      projectId: string;
      environmentId: string;
      label?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const token = generateToken();
      const data: ApiKey = {
        token,
        status: "active",
        label: label ?? "",
        createdAt: new Date().toISOString(),
        revokedAt: null,
        createdBy: user.uid,
      };
      const docRef = doc(
        db,
        "projects",
        projectId,
        "environments",
        environmentId,
        "clientIds",
        token,
      );
      await setDoc(docRef, data);
      // Audit
      try {
        await writeAuditEntry(
          projectId,
          buildAuditEntry({
            actorId: user.uid,
            action: "create",
            resourcePath: `environments/${environmentId}/apiKeys/${data.label || "Untitled"}`,
            newValue: { label: data.label || "Untitled" },
          }),
        );
      } catch {
        /* best-effort */
      }
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["apiKeys", variables.projectId, variables.environmentId],
      });
    },
  });
};

export const useRevokeApiKey = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      projectId,
      environmentId,
      token,
    }: {
      projectId: string;
      environmentId: string;
      token: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const docRef = doc(
        db,
        "projects",
        projectId,
        "environments",
        environmentId,
        "clientIds",
        token,
      );
      await updateDoc(docRef, {
        status: "revoked",
        revokedAt: new Date().toISOString(),
      });
      try {
        await writeAuditEntry(
          projectId,
          buildAuditEntry({
            actorId: user.uid,
            action: "update",
            resourcePath: `environments/${environmentId}/apiKeys/${token.slice(0, 8)}`,
            newValue: { status: "revoked" },
          }),
        );
      } catch {
        /* best-effort */
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["apiKeys", variables.projectId, variables.environmentId],
      });
    },
  });
};

export const useDeleteApiKey = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      projectId,
      environmentId,
      token,
    }: {
      projectId: string;
      environmentId: string;
      token: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const docRef = doc(
        db,
        "projects",
        projectId,
        "environments",
        environmentId,
        "clientIds",
        token,
      );
      await deleteDoc(docRef);
      try {
        await writeAuditEntry(
          projectId,
          buildAuditEntry({
            actorId: user.uid,
            action: "delete",
            resourcePath: `environments/${environmentId}/apiKeys/${token.slice(0, 8)}`,
          }),
        );
      } catch {
        /* best-effort */
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["apiKeys", variables.projectId, variables.environmentId],
      });
    },
  });
};
