import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { t } from "@lingui/core/macro";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PageLayout } from "@/components/page-layout";
import { SegmentManager } from "@/components/segment-manager";
import {
  useSegments,
  useCreateSegment,
  useDeleteSegment,
  useUpdateSegment,
} from "@/hooks/use-segments";
import { useRBAC } from "@/hooks/use-rbac";
import { useProjectStore } from "@/stores/project-store";

const SegmentsPage = () => {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const selectedEnvironmentId = useProjectStore((s) => s.selectedEnvironmentId);
  const { data: segments = [] } = useSegments(selectedProjectId);
  const createSegment = useCreateSegment();
  const updateSegment = useUpdateSegment();
  const deleteSegment = useDeleteSegment();
  const { role } = useRBAC();
  const isViewer = role === "viewer";

  if (!selectedProjectId) {
    return (
      <EmptyState
        icon={Users}
        message={<Trans>Select a project to manage segments.</Trans>}
      />
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title={<Trans>Segments</Trans>}
        description={
          <Trans>Define reusable audience groups for targeting rules.</Trans>
        }
      />
      <SegmentManager
        segments={segments}
        projectId={selectedProjectId}
        environmentId={selectedEnvironmentId ?? ""}
        onCreateSegment={(segment) =>
          createSegment.mutate(
            { projectId: selectedProjectId, segment },
            {
              onSuccess: () => toast.success(t`Segment created`),
              onError: () => toast.error(t`Failed to create segment`),
            },
          )
        }
        onUpdateSegment={(segmentId, data) => {
          const existing = segments.find((s) => s.id === segmentId);
          updateSegment.mutate(
            {
              projectId: selectedProjectId,
              segmentId,
              data,
              oldData: existing,
            },
            {
              onSuccess: () => toast.success(t`Segment updated`),
              onError: () => toast.error(t`Failed to update segment`),
            },
          );
        }}
        onDeleteSegment={(segmentId) => {
          const seg = segments.find((s) => s.id === segmentId);
          deleteSegment.mutate(
            { projectId: selectedProjectId, segmentId, segmentName: seg?.name },
            {
              onSuccess: () => toast.success(t`Segment deleted`),
              onError: () => toast.error(t`Failed to delete segment`),
            },
          );
        }}
        disabled={isViewer}
      />
    </PageLayout>
  );
};

export const Route = createFileRoute("/segments")({ component: SegmentsPage });
