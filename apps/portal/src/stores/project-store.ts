import { create } from "zustand";

const STORAGE_KEY = "selectedProjectId";

interface ProjectState {
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  selectedProjectId: (() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  })(),

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
}));
