import { useAuthStore } from "@/stores/auth-store";
import { useProjects } from "@/hooks/use-projects";
import { useProjectStore } from "@/stores/project-store";
import type { RBACRole } from "@/lib/types";

export const useRBAC = (): {
  role: RBACRole;
  canEditEnvironment: (isProduction?: boolean) => boolean;
  isAdmin: boolean;
} => {
  const user = useAuthStore((s) => s.user);
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const { data: projects = [] } = useProjects();
  const project = projects.find((p) => p.id === selectedProjectId);

  if (!user || !project) {
    return { role: "viewer", canEditEnvironment: () => false, isAdmin: false };
  }

  // Owner is always admin
  if (project.ownerId === user.uid) {
    return { role: "admin", canEditEnvironment: () => true, isAdmin: true };
  }

  // Check roles map (cast to ProjectWithRBAC shape)
  const roles = (project as Record<string, unknown>).roles as
    | Record<string, RBACRole>
    | undefined;
  const role: RBACRole = roles?.[user.uid] ?? "viewer";

  const canEditEnvironment = (isProduction?: boolean) => {
    if (role === "admin") return true;
    if (role === "editor") return !isProduction;
    return false;
  };

  return { role, canEditEnvironment, isAdmin: role === "admin" };
};
