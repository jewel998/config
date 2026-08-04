import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PageLayout } from "@/components/page-layout";
import { AuditLogViewer } from "@/components/audit-log-viewer";
import { useProjectStore } from "@/stores/project-store";

const AuditPage = () => {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);

  if (!selectedProjectId) {
    return (
      <EmptyState
        icon={History}
        message={<Trans>Select a project to view audit log.</Trans>}
      />
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title={<Trans>Audit Log</Trans>}
        description={
          <Trans>Track all configuration changes for SOC2 compliance.</Trans>
        }
      />
      <AuditLogViewer projectId={selectedProjectId} />
    </PageLayout>
  );
};

export const Route = createFileRoute("/audit")({ component: AuditPage });
