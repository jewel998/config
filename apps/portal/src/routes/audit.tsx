import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PageLayout } from "@/components/page-layout";
import { AuditLogViewer } from "@/components/audit-log-viewer";
import { useAuditLog } from "@/hooks/use-audit-log";
import { useProjectStore } from "@/stores/project-store";

const AuditPage = () => {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const { data: entries = [], isLoading } = useAuditLog(selectedProjectId);

  if (!selectedProjectId) {
    return <EmptyState icon={History} message={<Trans>Select a project to view audit log.</Trans>} />;
  }

  return (
    <PageLayout>
      <PageHeader title={<Trans>Audit Log</Trans>} description={<Trans>Track all configuration changes for SOC2 compliance.</Trans>} />
      <AuditLogViewer entries={entries} isLoading={isLoading} />
    </PageLayout>
  );
};

export const Route = createFileRoute("/audit")({ component: AuditPage });
