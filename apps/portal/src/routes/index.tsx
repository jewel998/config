import { Trans } from "@lingui/react/macro";
import { createFileRoute, Navigate } from "@tanstack/react-router";

import { OnboardingStepper } from "@/components/onboarding-stepper";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjects } from "@/hooks/use-projects";
import { useProjectStore } from "@/stores/project-store";

const IndexPage = () => {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const { data: projects, isLoading } = useProjects();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    );
  }

  if (!selectedProjectId || !projects?.length) {
    return <OnboardingStepper />;
  }

  // Redirect to /configs when a project is selected
  return <Navigate to="/configs" replace />;
};

export const Route = createFileRoute("/")({
  component: IndexPage,
});
