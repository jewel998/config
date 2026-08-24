import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Download, Search, ShieldAlert, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useProjects } from "@/hooks/use-projects";
import { useUserProfiles } from "@/hooks/use-user-profiles";
import { useProjectStore } from "@/stores/project-store";

interface GDPRPanelProps {
  onExport: (userId: string) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
}

interface TeamMember {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export const GDPRPanel = ({ onExport, onDelete }: GDPRPanelProps) => {
  const [exportUserId, setExportUserId] = useState("");
  const [deleteUserId, setDeleteUserId] = useState("");
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exportSearch, setExportSearch] = useState("");
  const [deleteSearch, setDeleteSearch] = useState("");
  const [showExportPicker, setShowExportPicker] = useState(false);
  const [showDeletePicker, setShowDeletePicker] = useState(false);

  // Get team members from the selected project
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const { data: projects = [] } = useProjects();
  const project = projects.find((p) => p.id === selectedProjectId);
  const authorizedUsers = (project?.authorizedUsers ?? []).filter((u) => !u.startsWith("email:"));
  const { data: profiles = {} } = useUserProfiles(authorizedUsers);

  const teamMembers: TeamMember[] = useMemo(() => {
    return authorizedUsers.map((uid) => ({
      uid,
      displayName: profiles[uid]?.displayName ?? null,
      email: profiles[uid]?.email ?? null,
      photoURL: profiles[uid]?.photoURL ?? null,
    }));
  }, [authorizedUsers, profiles]);

  const filteredExportMembers = useMemo(() => {
    if (!exportSearch.trim()) return teamMembers;
    const q = exportSearch.toLowerCase();
    return teamMembers.filter(
      (m) =>
        m.displayName?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.uid.toLowerCase().includes(q),
    );
  }, [teamMembers, exportSearch]);

  const filteredDeleteMembers = useMemo(() => {
    if (!deleteSearch.trim()) return teamMembers;
    const q = deleteSearch.toLowerCase();
    return teamMembers.filter(
      (m) =>
        m.displayName?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.uid.toLowerCase().includes(q),
    );
  }, [teamMembers, deleteSearch]);

  const selectedExportMember = teamMembers.find((m) => m.uid === exportUserId);
  const selectedDeleteMember = teamMembers.find((m) => m.uid === deleteUserId);

  const handleExport = async () => {
    if (!exportUserId.trim()) return;
    setExporting(true);
    try {
      await onExport(exportUserId.trim());
      toast.success(t`Data export completed`);
      setExportUserId("");
    } catch {
      toast.error(t`Export failed`);
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUserId.trim()) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await onDelete(deleteUserId.trim());
      toast.success(t`Data deletion request submitted`);
      setDeleteUserId("");
      setConfirmDelete(false);
    } catch {
      toast.error(t`Deletion failed`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Card */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-4 w-4" />
            <Trans>Data Export (GDPR Article 20)</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            <Trans>Export all personal data associated with a team member as a JSON file.</Trans>
          </p>

          {/* User Picker for Export */}
          <div className="relative">
            {selectedExportMember ? (
              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {selectedExportMember.displayName || selectedExportMember.uid}
                  </p>
                  {selectedExportMember.email && (
                    <p className="text-xs text-muted-foreground">{selectedExportMember.email}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setExportUserId("");
                    setShowExportPicker(true);
                  }}
                >
                  <Trans>Change</Trans>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t`Search team members...`}
                    value={exportSearch}
                    onChange={(e) => {
                      setExportSearch(e.target.value);
                      setShowExportPicker(true);
                    }}
                    onFocus={() => setShowExportPicker(true)}
                    className="pl-9"
                    aria-label={t`Search team members for export`}
                  />
                </div>
                {showExportPicker && (
                  <div className="max-h-[200px] overflow-auto rounded-md border">
                    {filteredExportMembers.length === 0 ? (
                      <p className="p-3 text-center text-sm text-muted-foreground">
                        <Trans>No team members found</Trans>
                      </p>
                    ) : (
                      filteredExportMembers.map((member) => (
                        <button
                          key={member.uid}
                          type="button"
                          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted transition-colors"
                          onClick={() => {
                            setExportUserId(member.uid);
                            setExportSearch("");
                            setShowExportPicker(false);
                          }}
                        >
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {(member.displayName || member.email || "?")[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {member.displayName || member.uid}
                            </p>
                            {member.email && (
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <Button
            className="w-full rounded-full gap-2"
            onClick={handleExport}
            disabled={!exportUserId.trim() || exporting}
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? <Trans>Exporting...</Trans> : <Trans>Export User Data</Trans>}
          </Button>
        </CardContent>
      </Card>

      {/* Delete Card */}
      <Card className="rounded-xl border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <ShieldAlert className="h-4 w-4" />
            <Trans>Data Deletion (GDPR Article 17)</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            <Trans>
              Permanently remove all personal data for a team member. This action cannot be undone.
            </Trans>
          </p>

          {/* User Picker for Delete */}
          <div className="relative">
            {selectedDeleteMember ? (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 px-3 py-2">
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {selectedDeleteMember.displayName || selectedDeleteMember.uid}
                  </p>
                  {selectedDeleteMember.email && (
                    <p className="text-xs text-muted-foreground">{selectedDeleteMember.email}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDeleteUserId("");
                    setConfirmDelete(false);
                    setShowDeletePicker(true);
                  }}
                >
                  <Trans>Change</Trans>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t`Search team members...`}
                    value={deleteSearch}
                    onChange={(e) => {
                      setDeleteSearch(e.target.value);
                      setShowDeletePicker(true);
                      setConfirmDelete(false);
                    }}
                    onFocus={() => setShowDeletePicker(true)}
                    className="pl-9"
                    aria-label={t`Search team members for deletion`}
                  />
                </div>
                {showDeletePicker && (
                  <div className="max-h-[200px] overflow-auto rounded-md border">
                    {filteredDeleteMembers.length === 0 ? (
                      <p className="p-3 text-center text-sm text-muted-foreground">
                        <Trans>No team members found</Trans>
                      </p>
                    ) : (
                      filteredDeleteMembers.map((member) => (
                        <button
                          key={member.uid}
                          type="button"
                          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted transition-colors"
                          onClick={() => {
                            setDeleteUserId(member.uid);
                            setDeleteSearch("");
                            setShowDeletePicker(false);
                          }}
                        >
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {(member.displayName || member.email || "?")[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {member.displayName || member.uid}
                            </p>
                            {member.email && (
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <Button
            variant="destructive"
            className="w-full rounded-full gap-2"
            onClick={handleDelete}
            disabled={!deleteUserId.trim() || deleting}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deleting ? (
              <Trans>Deleting...</Trans>
            ) : confirmDelete ? (
              <Trans>Confirm Delete</Trans>
            ) : (
              <Trans>Delete User Data</Trans>
            )}
          </Button>
          {confirmDelete && (
            <p className="text-xs text-destructive">
              <Trans>Click again to confirm permanent deletion.</Trans>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
