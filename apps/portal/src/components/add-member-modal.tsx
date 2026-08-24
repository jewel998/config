import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Mail, UserPlus } from "lucide-react";
import { useState } from "react";

import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { UserAvatar } from "@/components/user-avatar";
import { useSearchUserByEmail } from "@/hooks/use-search-user-by-email";
import type { UserProfile } from "@/lib/team-utils";
import type { RBACRole } from "@/lib/types";

interface AddMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingMemberUids: string[];
  onAddUser: (uid: string, role: RBACRole, displayName?: string) => void;
  onInviteEmail: (email: string, role: RBACRole) => void;
  pendingEmails: string[];
}

export const AddMemberModal = ({
  open,
  onOpenChange,
  existingMemberUids,
  onAddUser,
  onInviteEmail,
  pendingEmails,
}: AddMemberModalProps) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RBACRole>("viewer");
  const { data: foundUser, isLoading } = useSearchUserByEmail(email);

  const isAlreadyMember = foundUser && existingMemberUids.includes(foundUser.uid);
  const isAlreadyInvited = pendingEmails.includes(email.trim().toLowerCase());

  const handleAdd = () => {
    if (!foundUser) return;
    onAddUser(foundUser.uid, role, foundUser.displayName ?? foundUser.email ?? undefined);
    setEmail("");
    onOpenChange(false);
  };

  const handleInvite = () => {
    if (!email.trim()) return;
    onInviteEmail(email.trim(), role);
    setEmail("");
    onOpenChange(false);
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={<Trans>Add Team Member</Trans>}
      description={<Trans>Search by email to add an existing user, or send an invite.</Trans>}
    >
      <div className="space-y-5">
        {/* Email search input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            <Trans>Email address</Trans>
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              placeholder={t`Enter email address...`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        {/* Loading state */}
        {isLoading && email.includes("@") && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner /> <Trans>Searching...</Trans>
          </div>
        )}

        {/* Found user card */}
        {foundUser && !isLoading && (
          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center gap-3">
              <UserAvatar displayName={foundUser.displayName} photoURL={foundUser.photoURL} />
              <div>
                <p className="text-sm font-medium">{foundUser.displayName ?? foundUser.uid}</p>
                <p className="text-xs text-muted-foreground">{foundUser.email}</p>
              </div>
            </div>
            {isAlreadyMember ? (
              <p className="text-xs text-amber-600">
                <Trans>This user is already a member of this project.</Trans>
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <Select value={role} onValueChange={(v) => setRole(v as RBACRole)}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" className="rounded-full gap-1" onClick={handleAdd}>
                  <UserPlus className="h-3.5 w-3.5" />
                  <Trans>Add</Trans>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Not found → invite */}
        {!foundUser && !isLoading && email.includes("@") && email.length > 3 && (
          <div className="rounded-lg border border-dashed p-3 space-y-3">
            <p className="text-sm text-muted-foreground">
              <Trans>No user found with this email. Send them an invite?</Trans>
            </p>
            {isAlreadyInvited ? (
              <p className="text-xs text-amber-600">
                <Trans>An invite already exists for this email.</Trans>
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <Select value={role} onValueChange={(v) => setRole(v as RBACRole)}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" className="rounded-full gap-1" onClick={handleInvite}>
                  <Mail className="h-3.5 w-3.5" />
                  <Trans>Send Invite</Trans>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
};
