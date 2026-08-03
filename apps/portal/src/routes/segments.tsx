import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PageLayout } from "@/components/page-layout";
import { SegmentManager } from "@/components/segment-manager";
import { useSegments, useCreateSegment, useDeleteSegment } from "@/hooks/use-segments";
import { useRBAC } from "@/hooks/use-rbac";
import { useProjectStore } from "@/stores/project-store";

const SegmentsPage = () => {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const { data: segments = [] } = useSegments(selectedProjectId);
  const createSegment = useCreateSegment();
  const deleteSegment = useDeleteSegment();
  const { role } = useRBAC();
  const isViewer = role === "viewer";

  if (!selectedProjectId) {
    return <EmptyState icon={Users} message={<Trans>Select a project to manage segments.</Trans>} />;
  }

  return (
    <PageLayout>
      <PageHeader title={<Trans>Segments</Trans>} description={<Trans>Define reusable audience groups for targeting rules.</Trans>} />
      <SegmentManager
        segments={segments}
        onCreateSegment={(segment) => createSegment.mutate({ projectId: selectedProjectId, segment })}
        onDeleteSegment={(segmentId) => deleteSegment.mutate({ projectId: selectedProjectId, segmentId })}
        disabled={isViewer}
      />
    </PageLayout>
  );
};

export const Route = createFileRoute("/segments")({ component: SegmentsPage });
