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
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["apiKeys", variables.projectId, variables.environmentId],
      });
    },
  });
};
