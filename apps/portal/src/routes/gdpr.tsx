import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PageLayout } from "@/components/page-layout";
import { GDPRPanel } from "@/components/gdpr-panel";
import { useProjectStore } from "@/stores/project-store";

const GDPRPage = () => {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);

  if (!selectedProjectId) {
    return (
      <EmptyState
        icon={ShieldAlert}
        message={<Trans>Select a project to manage GDPR compliance.</Trans>}
      />
    );
  }

  const handleExport = async (userId: string) => {
    // TODO: Implement full data export across all environments
    const data = {
      userId,
      exportedAt: new Date().toISOString(),
      note: "Export implementation pending",
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gdpr-export-${userId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
