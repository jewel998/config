import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { Download, ShieldAlert, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface GDPRPanelProps {
  onExport: (userId: string) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
}

export const GDPRPanel = ({ onExport, onDelete }: GDPRPanelProps) => {
  const [exportUserId, setExportUserId] = useState("");
  const [deleteUserId, setDeleteUserId] = useState("");
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    if (!confirmDelete) { setConfirmDelete(true); return; }
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
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-4 w-4" />
            <Trans>Data Export (GDPR Article 20)</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground"><Trans>Export all personal data associated with a user ID as a JSON file.</Trans></p>
          <div className="flex gap-2">
            <Input placeholder={t`User ID to export`} value={exportUserId} onChange={(e) => setExportUserId(e.target.value)} className="flex-1" />
            <Button className="rounded-full gap-2" onClick={handleExport} disabled={!exportUserId.trim() || exporting}>
              <Download className="h-3.5 w-3.5" />
              {exporting ? <Trans>Exporting...</Trans> : <Trans>Export</Trans>}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <ShieldAlert className="h-4 w-4" />
            <Trans>Data Deletion (GDPR Article 17)</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground"><Trans>Permanently remove all personal data for a user ID. This action cannot be undone.</Trans></p>
          <div className="flex gap-2">
            <Input placeholder={t`User ID to delete`} value={deleteUserId} onChange={(e) => { setDeleteUserId(e.target.value); setConfirmDelete(false); }} className="flex-1" />
            <Button variant="destructive" className="rounded-full gap-2" onClick={handleDelete} disabled={!deleteUserId.trim() || deleting}>
              <Trash2 className="h-3.5 w-3.5" />
              {deleting ? <Trans>Deleting...</Trans> : confirmDelete ? <Trans>Confirm Delete</Trans> : <Trans>Delete</Trans>}
            </Button>
          </div>
          {confirmDelete && <p className="text-xs text-destructive"><Trans>Click again to confirm permanent deletion.</Trans></p>}
        </CardContent>
      </Card>
    </div>
  );
};
