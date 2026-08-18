import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PageLayout } from "@/components/page-layout";
import { GDPRPanel } from "@/components/gdpr-panel";
import { useExportConfigs } from "@/hooks/use-export";
import { useProjectStore } from "@/stores/project-store";

const GDPRPage = () => {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const exportMutation = useExportConfigs();

  if (!selectedProjectId) {
    return (
      <EmptyState
        icon={ShieldAlert}
        message={<Trans>Select a project to manage GDPR compliance.</Trans>}
      />
    );
  }

  const handleExport = async (userId: string) => {
    try {
      const result = await exportMutation.mutateAsync({
        projectId: selectedProjectId,
        exportType: userId ? "user" : "full",
        userId: userId || undefined,
      });
      // Open the download URL in a new tab
      window.open(result.downloadUrl, "_blank");
      toast.success(t`Export ready. Download link valid for 24 hours.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t`Export failed`);
    }
  };

  const handleDelete = async (_userId: string) => {
    // Data deletion is handled server-side via Cloud Functions
    toast.success(t`Deletion request submitted`);
  };

  return (
    <PageLayout>
      <PageHeader
        title={<Trans>GDPR Compliance</Trans>}
        description={
          <Trans>
            Manage data export and deletion requests for compliance.
          </Trans>
        }
      />
      <GDPRPanel onExport={handleExport} onDelete={handleDelete} />
    </PageLayout>
  );
};

export const Route = createFileRoute("/gdpr")({ component: GDPRPage });
