import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RBACRole } from "@/lib/types";

interface RBACManagerProps {
  projectId: string;
  roles: Record<string, RBACRole>;
  ownerId: string;
  currentUserId: string;
  onRoleChange: (userId: string, newRole: RBACRole) => void;
  onRemoveMember: (userId: string) => void;
  onAddMember?: (userId: string, role: RBACRole) => void;
}

export const RBACManager = ({
  roles,
  ownerId,
  currentUserId,
  onRoleChange,
  onRemoveMember,
  onAddMember,
}: RBACManagerProps) => {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteId, setInviteId] = useState("");
  const [inviteRole, setInviteRole] = useState<RBACRole>("viewer");

  const isCurrentAdmin =
    currentUserId === ownerId || roles[currentUserId] === "admin";
  const adminCount = Object.values(roles).filter((r) => r === "admin").length +
    (roles[ownerId] !== "admin" ? 1 : 0); // owner is always admin

  const isLastAdmin = (userId: string) =>
    (userId === ownerId || roles[userId] === "admin") && adminCount <= 1;

  const handleInvite = () => {
    if (!inviteId.trim() || !onAddMember) return;
    onAddMember(inviteId.trim(), inviteRole);
    setInviteId("");
    setInviteRole("viewer");
    setShowInvite(false);
  };

  // Build a combined list: owner + roles entries
  const memberEntries: Array<[string, RBACRole]> = [];
  // Always show owner first
  if (!(ownerId in roles)) {
    memberEntries.push([ownerId, "admin"]);
  }
  for (const [uid, role] of Object.entries(roles)) {
    memberEntries.push([uid, role]);
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          <Trans>Team Members</Trans>
        </CardTitle>
        {isCurrentAdmin && onAddMember && (
          <Button size="sm" className="rounded-full gap-1" onClick={() => setShowInvite(true)}>
            <Plus className="h-3.5 w-3.5" />
            <Trans>Add Member</Trans>
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {showInvite && (
          <div className="flex gap-2 rounded-lg border p-3">
            <Input
              placeholder={t`User ID or email`}
              value={inviteId}
              onChange={(e) => setInviteId(e.target.value)}
              className="flex-1"
              autoFocus
            />
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as RBACRole)}>
              <SelectTrigger className="h-9 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="rounded-full" onClick={handleInvite} disabled={!inviteId.trim()}>
              <Trans>Add</Trans>
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setShowInvite(false)}>
              <Trans>Cancel</Trans>
            </Button>
          </div>
        )}

        {memberEntries.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            <Trans>No team members yet.</Trans>
          </p>
        )}

        {memberEntries.map(([userId, role]) => {
          const isOwner = userId === ownerId;
          const canModify = isCurrentAdmin && !isOwner;

          return (
            <div
              key={userId}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="truncate text-sm font-mono">{userId}</span>
                {isOwner && (
                  <Badge variant="secondary" className="text-[10px]">
                    <Trans>Owner</Trans>
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {canModify ? (
                  <Select
                    value={role}
                    onValueChange={(v) =>
                      onRoleChange(userId, v as RBACRole)
                    }
                    disabled={isLastAdmin(userId)}
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
                {canModify && !isLastAdmin(userId) && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onRemoveMember(userId)}
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
  );
};
