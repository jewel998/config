import { collection, onSnapshot, query, where } from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { useAuth } from "./auth";
import { db } from "./firebase";

export interface Project {
  id: string;
  name: string;
  ownerId: string;
  authorizedUsers: string[];
  createdAt: string;
  updatedAt: string;
}

interface ProjectContextValue {
  projects: Project[];
  selectedProjectId: string | null;
  selectedProject: Project | null;
  setSelectedProjectId: (id: string | null) => void;
  loading: boolean;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

const STORAGE_KEY = "selectedProjectId";

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectIdState] = useState<
    string | null
  >(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const setSelectedProjectId = (id: string | null) => {
    setSelectedProjectIdState(id);
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEY, id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "projects"),
      where("authorizedUsers", "array-contains", user.uid),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Project[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Project, "id">),
      }));
      setProjects(items);
      setLoading(false);

      // If selected project no longer exists in list, clear selection
      if (selectedProjectId && !items.some((p) => p.id === selectedProjectId)) {
        if (items.length > 0) {
          setSelectedProjectId(items[0].id);
        } else {
          setSelectedProjectId(null);
        }
      }
    });

    return unsubscribe;
  }, [user]);

  const selectedProject =
    projects.find((p) => p.id === selectedProjectId) ?? null;

  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProjectId,
        selectedProject,
        setSelectedProjectId,
        loading,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = (): ProjectContextValue => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
};
