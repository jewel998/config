import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { t } from "@lingui/core/macro";
import { doc, updateDoc } from "firebase/firestore";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PageLayout } from "@/components/page-layout";
import { RBACManager } from "@/components/rbac-manager";
import { useProjects } from "@/hooks/use-projects";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectStore } from "@/stores/project-store";
import { db } from "@/lib/firebase";
import type { RBACRole } from "@/lib/types";

const TeamPage = () => {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const user = useAuthStore((s) => s.user);
  const { data: projects = [] } = useProjects();
  const project = projects.find((p) => p.id === selectedProjectId);

  if (!selectedProjectId || !project) {
    return <EmptyState icon={ShieldCheck} message={<Trans>Select a project to manage team access.</Trans>} />;
  }

  const roles = (project as Record<string, unknown>).roles as Record<string, RBACRole> | undefined ?? {};

  const handleRoleChange = async (userId: string, newRole: RBACRole) => {
    try {
      const projectRef = doc(db, "projects", selectedProjectId);
      await updateDoc(projectRef, { [`roles.${userId}`]: newRole });
      toast.success(t`Role updated`);
    } catch {
      toast.error(t`Failed to update role`);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const projectRef = doc(db, "projects", selectedProjectId);
      const newRoles = { ...roles };
      delete newRoles[userId];
      const newAuthorized = project.authorizedUsers.filter((u) => u !== userId);
      await updateDoc(projectRef, { roles: newRoles, authorizedUsers: newAuthorized });
      toast.success(t`Member removed`);
    } catch {
      toast.error(t`Failed to remove member`);
    }
  };

  return (
    <PageLayout>
      <PageHeader title={<Trans>Team & Access</Trans>} description={<Trans>Manage project members and their roles.</Trans>} />
      <RBACManager
        projectId={selectedProjectId}
        roles={roles}
        ownerId={project.ownerId}
        currentUserId={user?.uid ?? ""}
        onRoleChange={handleRoleChange}
        onRemoveMember={handleRemoveMember}
      />
    </PageLayout>
  );
};

export const Route = createFileRoute("/team")({ component: TeamPage });
