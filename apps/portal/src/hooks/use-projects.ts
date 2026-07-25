import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  limit as firestoreLimit,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useAuthStore } from "@/stores/auth-store";

export interface Project {
  id: string;
  name: string;
  ownerId: string;
  authorizedUsers: string[];
  createdAt: string;
  updatedAt: string;
}

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

  return useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error("Not authenticated");
      const docRef = await addDoc(collection(db, "projects"), {
        name: name.trim(),
        ownerId: user.uid,
        authorizedUsers: [user.uid],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      await updateDoc(doc(db, "projects", projectId), {
        deletedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
};
