import { Trans } from "@lingui/react/macro";
import { Trash2 } from "lucide-react";

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
import type { RBACRole } from "@/lib/types";

interface RBACManagerProps {
  projectId: string;
  roles: Record<string, RBACRole>;
  ownerId: string;
  currentUserId: string;
  onRoleChange: (userId: string, newRole: RBACRole) => void;
  onRemoveMember: (userId: string) => void;
}

export const RBACManager = ({
  roles,
  ownerId,
  currentUserId,
  onRoleChange,
  onRemoveMember,
}: RBACManagerProps) => {
  const isCurrentAdmin =
    currentUserId === ownerId || roles[currentUserId] === "admin";
  const adminCount = Object.values(roles).filter((r) => r === "admin").length +
    (roles[ownerId] !== "admin" ? 1 : 0); // owner is always admin

  const isLastAdmin = (userId: string) =>
    (userId === ownerId || roles[userId] === "admin") && adminCount <= 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trans>Team Members</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(roles).map(([userId, role]) => {
          const isOwner = userId === ownerId;
          const canModify = isCurrentAdmin && !isOwner;

          return (
            <div
              key={userId}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="truncate text-sm">{userId}</span>
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
