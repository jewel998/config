import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Key, Lock } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { useProject } from "@/lib/project-context";

const SecretsPage = () => {
  const { selectedProjectId } = useProject();

  if (!selectedProjectId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="rounded-full bg-muted p-4">
          <Key className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          <Trans>Select a project to manage secrets.</Trans>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          <Trans>Secrets</Trans>
        </h1>
        <p className="text-sm text-muted-foreground">
          <Trans>Per-environment encrypted key-value pairs.</Trans>
        </p>
      </div>

      <Card className="rounded-xl">
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <div className="rounded-full bg-muted p-4">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium">
                <Trans>Secrets management coming soon</Trans>
              </p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                <Trans>
                  You'll be able to store encrypted environment variables and
                  API keys per environment, with version history and access
                  control.
                </Trans>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const Route = createFileRoute("/secrets")({
  component: SecretsPage,
});
