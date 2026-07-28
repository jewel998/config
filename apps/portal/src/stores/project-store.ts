import { create } from "zustand";

const PROJECT_KEY = "selectedProjectId";
const ENV_KEY = "selectedEnvironmentId";

interface ProjectState {
  selectedProjectId: string | null;
  selectedEnvironmentId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  setSelectedEnvironmentId: (id: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  selectedProjectId: (() => {
    try {
      return localStorage.getItem(PROJECT_KEY);
    } catch {
      return null;
    }
  })(),

  selectedEnvironmentId: (() => {
    try {
      return localStorage.getItem(ENV_KEY);
    } catch {
      return null;
    }
  })(),

  setSelectedProjectId: (id) => {
    set({ selectedProjectId: id, selectedEnvironmentId: null });
    try {
      if (id) {
        localStorage.setItem(PROJECT_KEY, id);
      } else {
        localStorage.removeItem(PROJECT_KEY);
      }
      localStorage.removeItem(ENV_KEY);
    } catch {
      // ignore
    }
  },

  setSelectedEnvironmentId: (id) => {
    set({ selectedEnvironmentId: id });
    try {
      if (id) {
        localStorage.setItem(ENV_KEY, id);
      } else {
        localStorage.removeItem(ENV_KEY);
      }
    } catch {
      // ignore
    }
  },
}));
