import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export interface Environment {
  id: string;
  name: string;
  projectId: string;
  allowedDomains: string[];
  createdAt: string;
  updatedAt: string;
}

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

  return useMutation({
    mutationFn: async ({
      projectId,
      name,
      allowedDomains,
    }: {
      projectId: string;
      name: string;
      allowedDomains: string[];
    }) => {
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["environments", variables.projectId],
      });
    },
  });
};

export const useDeleteEnvironment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      envId,
    }: {
      projectId: string;
      envId: string;
    }) => {
      await deleteDoc(doc(db, "projects", projectId, "environments", envId));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["environments", variables.projectId],
      });
    },
  });
};
