import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Clock, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { arrayRemove, doc, updateDoc } from "firebase/firestore";
import { useQueryClient } from "@tanstack/react-query";

import { AddMemberModal } from "@/components/add-member-modal";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PageLayout } from "@/components/page-layout";
import { PageTourButton } from "@/components/page-tour-button";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  usePendingInvites,
  useCreateInvite,
  useCancelInvite,
} from "@/hooks/use-pending-invites";
import { useUserProfiles } from "@/hooks/use-user-profiles";
import { useProjects } from "@/hooks/use-projects";
import { useRBAC } from "@/hooks/use-rbac";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectStore } from "@/stores/project-store";
import { db } from "@/lib/firebase";
import { writeAuditEntry, buildAuditEntry } from "@/lib/audit";
import type { RBACRole } from "@/lib/types";

const TeamPage = () => {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const user = useAuthStore((s) => s.user);
  const { data: projects = [] } = useProjects();
  const project = projects.find((p) => p.id === selectedProjectId);
  const { isAdmin } = useRBAC();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);

  const allAuthorizedUsers = project?.authorizedUsers ?? [];
  const authorizedUsers = allAuthorizedUsers.filter(
    (u) => !u.startsWith("email:"),
  );
  const roles =
    ((project as Record<string, unknown>)?.roles as Record<string, RBACRole>) ??
    {};

  const { data: profiles = {} } = useUserProfiles(authorizedUsers);
  const { data: pendingInvites = [] } = usePendingInvites(selectedProjectId);
  const createInvite = useCreateInvite();
  const cancelInvite = useCancelInvite();

  if (!selectedProjectId || !project) {
    return (
      <EmptyState
        icon={ShieldCheck}
        message={<Trans>Select a project to manage team access.</Trans>}
      />
    );
  }

  const adminCount =
    Object.values(roles).filter((r) => r === "admin").length +
    (project.ownerId && !(project.ownerId in roles) ? 1 : 0);

  const invalidateProjects = () => {
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  };

  const handleRoleChange = async (userId: string, newRole: RBACRole) => {
    // Prevent users from changing their own role
    if (userId === user?.uid) {
      toast.error(t`You cannot change your own role`);
      return;
    }
    try {
      await updateDoc(doc(db, "projects", selectedProjectId), {
        [`roles.${userId}`]: newRole,
      });
      const memberName =
        profiles[userId]?.displayName || profiles[userId]?.email || userId;
      await writeAuditEntry(
        selectedProjectId,
        buildAuditEntry({
          actorId: user!.uid,
          action: "update",
          resourcePath: `team/members/${memberName}`,
          oldValue: { role: roles[userId] ?? "viewer" },
          newValue: { role: newRole },
        }),
      );
      queryClient.invalidateQueries({
        queryKey: ["audit_log", selectedProjectId],
      });
      toast.success(t`Role updated`);
      invalidateProjects();
    } catch {
      toast.error(t`Failed to update role`);
    }
  };

  const handleRemove = async (userId: string) => {
    // Prevent self-removal for the owner
    if (userId === project.ownerId) return;
    const isLastAdmin = roles[userId] === "admin" && adminCount <= 1;
    if (isLastAdmin) {
      toast.error(t`Cannot remove the last admin`);
      return;
    }
    if (!confirm(t`Remove this member from the project?`)) return;
    try {
      const newRoles = { ...roles };
      delete newRoles[userId];
      await updateDoc(doc(db, "projects", selectedProjectId), {
        authorizedUsers: arrayRemove(userId),
        roles: newRoles,
      });
      const memberName =
        profiles[userId]?.displayName || profiles[userId]?.email || userId;
      await writeAuditEntry(
        selectedProjectId,
        buildAuditEntry({
          actorId: user!.uid,
          action: "delete",
          resourcePath: `team/members/${memberName}`,
        }),
      );
      queryClient.invalidateQueries({
        queryKey: ["audit_log", selectedProjectId],
      });
      toast.success(t`Member removed`);
      invalidateProjects();
    } catch {
      toast.error(t`Failed to remove member`);
    }
  };

  const handleAddUser = async (uid: string, role: RBACRole) => {
    try {
      await updateDoc(doc(db, "projects", selectedProjectId), {
        [`roles.${uid}`]: role,
        authorizedUsers: [...authorizedUsers, uid],
      });
      await writeAuditEntry(
        selectedProjectId,
        buildAuditEntry({
          actorId: user!.uid,
          action: "create",
          resourcePath: `team/members/${uid}`,
          newValue: { role },
        }),
      );
      queryClient.invalidateQueries({
        queryKey: ["audit_log", selectedProjectId],
      });
      toast.success(t`Member added`);
      invalidateProjects();
    } catch {
      toast.error(t`Failed to add member`);
    }
  };

  const handleInvite = (email: string, role: RBACRole) => {
    createInvite.mutate(
      { email, projectId: selectedProjectId, role },
      {
        onSuccess: () => toast.success(t`Invite sent`),
        onError: () => toast.error(t`Failed to send invite`),
      },
    );
  };

  return (
    <PageLayout>
      <PageHeader
        title={<Trans>Team & Access</Trans>}
        description={<Trans>Manage project members and their roles.</Trans>}
        actions={
          <>
            <PageTourButton flowId="tour-team" label={t`Team guide`} />
            {isAdmin && (
              <Button
                className="gap-2 rounded-full"
                onClick={() => setShowModal(true)}
              >
                <Plus className="h-4 w-4" />
                <Trans>Add Member</Trans>
              </Button>
            )}
          </>
        }
      />

      {/* Members list */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">
            <Trans>Members</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {authorizedUsers.map((uid) => {
            const profile = profiles[uid];
            const role =
              uid === project.ownerId ? "admin" : (roles[uid] ?? "viewer");
            const isOwner = uid === project.ownerId;
            const isSelf = uid === user?.uid;
            // Can modify: must be admin, can't modify owner, can't modify self
            const canModifyRole = isAdmin && !isOwner && !isSelf;

            return (
              <div
                key={uid}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar
                    displayName={profile?.displayName ?? null}
                    photoURL={profile?.photoURL ?? null}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {profile?.displayName ?? uid}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {profile?.email ?? ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canModifyRole ? (
                    <Select
                      value={role}
                      onValueChange={(v) =>
                        handleRoleChange(uid, v as RBACRole)
                      }
                    >
                      <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className="text-xs capitalize">
                      {role}
                    </Badge>
                  )}
                  {isOwner && (
                    <Badge variant="secondary" className="text-[10px]">
                      <Trans>Owner</Trans>
                    </Badge>
                  )}
                  {isSelf && (
                    <Badge variant="outline" className="text-[10px]">
                      <Trans>You</Trans>
                    </Badge>
                  )}
                  {isAdmin && !isOwner && !isSelf && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleRemove(uid)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">
              <Trans>Pending Invites</Trans>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-dashed p-3"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm">{invite.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {invite.role}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    <Trans>Pending</Trans>
                  </Badge>
                  {isAdmin && invite.id && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() =>
                        cancelInvite.mutate({
                          inviteId: invite.id!,
                          projectId: selectedProjectId,
                          email: invite.email,
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add member modal */}
      <AddMemberModal
        open={showModal}
        onOpenChange={setShowModal}
        existingMemberUids={authorizedUsers}
        onAddUser={handleAddUser}
        onInviteEmail={handleInvite}
        pendingEmails={pendingInvites.map((i) => i.email)}
      />
    </PageLayout>
  );
};

export const Route = createFileRoute("/team")({ component: TeamPage });
