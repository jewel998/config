import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useDeleteProject, useProjects } from "@/hooks/use-projects";
import { useProjectStore } from "@/stores/project-store";

const SettingsPage = () => {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const setSelectedProjectId = useProjectStore((s) => s.setSelectedProjectId);
  const { data: projects, isLoading } = useProjects();
  const deleteProject = useDeleteProject();

  const selectedProject = projects?.find((p) => p.id === selectedProjectId);

  if (!selectedProjectId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="rounded-full bg-muted p-4">
          <Settings className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          <Trans>Select a project to view settings.</Trans>
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="rounded-full bg-muted p-4">
          <Settings className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          <Trans>Project not found.</Trans>
        </p>
      </div>
    );
  }

  const handleDelete = () => {
    deleteProject.mutate(selectedProjectId, {
      onSuccess: () => {
        setSelectedProjectId(null);
        toast.success(t`Project deleted`);
      },
      onError: () => {
        toast.error(t`Failed to delete project`);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          <Trans>Project Settings</Trans>
        </h1>
        <p className="text-sm text-muted-foreground">
          <Trans>Manage project configuration and team access.</Trans>
        </p>
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">
            <Trans>General</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium">
              <Trans>Project Name</Trans>
            </p>
            <p className="text-sm text-muted-foreground">
              {selectedProject.name}
            </p>
          </div>
          <Separator />
          <div>
            <p className="text-sm font-medium">
              <Trans>Project ID</Trans>
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {selectedProjectId}
            </p>
          </div>
          <Separator />
          <div>
            <p className="text-sm font-medium">
              <Trans>Created</Trans>
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {selectedProject.createdAt
                ? new Date(selectedProject.createdAt).toLocaleDateString()
                : "—"}
            </p>
          </div>
          <Separator />
          <div>
            <p className="text-sm font-medium">
              <Trans>Owner</Trans>
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {selectedProject.ownerId}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            <Trans>Danger Zone</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <Trans>
              Deleting a project is irreversible. All environments, configs, and
              API keys will become inaccessible.
            </Trans>
          </p>
          <Button
            variant="destructive"
            className="min-w-28 rounded-full"
            onClick={handleDelete}
            disabled={deleteProject.isPending}
          >
            {deleteProject.isPending ? (
              <Spinner />
            ) : (
              <Trans>Delete Project</Trans>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});
