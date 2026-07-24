import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Settings, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useProjectStore } from "@/stores/project-store";

const SettingsPage = () => {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const selectedProject = useProjectStore((s) => s.selectedProject());

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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                <Trans>Project Name</Trans>
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedProject?.name}
              </p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                <Trans>Project ID</Trans>
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                {selectedProjectId}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            <Trans>Team Members</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            <Trans>Team management coming soon.</Trans>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});
