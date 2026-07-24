import { collection, onSnapshot, query, where } from "firebase/firestore";
import type { Unsubscribe } from "firebase/firestore";
import { create } from "zustand";

import { db } from "@/lib/firebase";

export interface Project {
  id: string;
  name: string;
  ownerId: string;
  authorizedUsers: string[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "selectedProjectId";

const getStoredProjectId = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

interface ProjectState {
  projects: Project[];
  selectedProjectId: string | null;
  loading: boolean;
  setSelectedProjectId: (id: string | null) => void;
  selectedProject: () => Project | null;
  subscribe: (uid: string) => Unsubscribe;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  selectedProjectId: getStoredProjectId(),
  loading: true,

  setSelectedProjectId: (id) => {
    set({ selectedProjectId: id });
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEY, id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  },

  selectedProject: () => {
    const { projects, selectedProjectId } = get();
    return projects.find((p) => p.id === selectedProjectId) ?? null;
  },

  subscribe: (uid: string) => {
    set({ loading: true });

    const q = query(
      collection(db, "projects"),
      where("authorizedUsers", "array-contains", uid),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Project[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Project, "id">),
      }));
      const { selectedProjectId, setSelectedProjectId } = get();

      // If selected project no longer exists, auto-select first
      if (selectedProjectId && !items.some((p) => p.id === selectedProjectId)) {
        setSelectedProjectId(items.length > 0 ? items[0].id : null);
      }

      set({ projects: items, loading: false });
    });

    return unsubscribe;
  },
}));
