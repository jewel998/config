import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Globe, Plus, Server, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { DateDisplay } from "@/components/date-display";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PageLayout } from "@/components/page-layout";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  useEnvironments,
  useCreateEnvironment,
  useDeleteEnvironment,
} from "@/hooks/use-environments";
import { useProjectStore } from "@/stores/project-store";

const envSchema = z.object({
  name: z
    .string()
    .min(1, "Environment name is required")
    .max(50, "Name must be 50 characters or less"),
  domains: z
    .string()
    .transform((val) =>
      val
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean),
    )
    .pipe(
      z.array(
        z
          .string()
          .regex(
            /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/,
            "Invalid domain format",
          ),
      ),
    ),
});

const ENV_SUGGESTIONS = ["production", "staging", "development", "qa", "pre-production"];

const EnvironmentsPage = () => {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const { data: environments = [], isLoading } = useEnvironments(selectedProjectId);
  const createEnvironment = useCreateEnvironment();
  const deleteEnvironment = useDeleteEnvironment();

  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDomains, setNewDomains] = useState("");
  const [errors, setErrors] = useState<{ name?: string; domains?: string }>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!selectedProjectId) return;

    const result = envSchema.safeParse({ name: newName, domains: newDomains });
    if (!result.success) {
      const fieldErrors: { name?: string; domains?: string } = {};
      for (const issue of result.error.issues) {
        if (issue.path[0] === "name") {
          fieldErrors.name = issue.message;
        } else if (issue.path[0] === "domains" || issue.path.includes("domains")) {
          fieldErrors.domains = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    createEnvironment.mutate(
      {
        projectId: selectedProjectId,
        name: result.data.name,
        allowedDomains: result.data.domains,
      },
      {
        onSuccess: () => {
          setNewName("");
          setNewDomains("");
          setShowForm(false);
          toast.success(t`Environment created`);
        },
        onError: () => {
          toast.error(t`Failed to create environment`);
        },
      },
    );
  };

  const handleDelete = (envId: string) => {
    if (!selectedProjectId) return;
    if (confirmDeleteId !== envId) {
      setConfirmDeleteId(envId);
      setTimeout(() => setConfirmDeleteId(null), 5000);
      return;
    }
    deleteEnvironment.mutate(
      { projectId: selectedProjectId, envId },
      {
        onSuccess: () => {
          setConfirmDeleteId(null);
          toast.success(t`Environment deleted`);
        },
        onError: () => {
          toast.error(t`Failed to delete environment`);
        },
      },
    );
  };

  if (!selectedProjectId) {
    return (
      <EmptyState icon={Server} message={<Trans>Select a project to view environments.</Trans>} />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title={<Trans>Environments</Trans>}
        description={<Trans>Manage deployment targets and allowed domains.</Trans>}
        actions={
          <Button className="gap-2 rounded-full" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            <Trans>New Environment</Trans>
          </Button>
        }
      />

      {/* Create form in ResponsiveModal */}
      <ResponsiveModal
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) {
            setNewName("");
            setNewDomains("");
            setErrors({});
          }
        }}
        title={<Trans>New Environment</Trans>}
        description={<Trans>Add a deployment target for your project.</Trans>}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {ENV_SUGGESTIONS.map((suggestion) => (
              <Button
                key={suggestion}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full h-auto px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                onClick={() => setNewName(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
          <Input
            placeholder={t`Environment name (e.g. production, staging)`}
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          <Input
            placeholder={t`Allowed domains (comma-separated, e.g. example.com, app.example.com)`}
            value={newDomains}
            onChange={(e) => {
              setNewDomains(e.target.value);
              setErrors((prev) => ({ ...prev, domains: undefined }));
            }}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          {errors.domains && <p className="text-xs text-destructive">{errors.domains}</p>}
          <div className="flex items-center gap-2">
            <Button
              className="w-20 rounded-full"
              onClick={handleCreate}
              disabled={createEnvironment.isPending || !newName.trim()}
            >
              {createEnvironment.isPending ? <Spinner /> : <Trans>Create</Trans>}
            </Button>
            <Button
              variant="ghost"
              className="rounded-full"
              onClick={() => {
                setShowForm(false);
                setNewName("");
                setNewDomains("");
                setErrors({});
              }}
            >
              <Trans>Cancel</Trans>
            </Button>
          </div>
        </div>
      </ResponsiveModal>

      {/* Environments list */}
      {environments.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent>
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <div className="rounded-full bg-muted p-4">
                <Server className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium">
                  <Trans>No environments yet</Trans>
                </p>
                <p className="text-sm text-muted-foreground">
                  <Trans>Add environments like production, staging, or development.</Trans>
                </p>
              </div>
              <Button
                variant="outline"
                className="gap-2 rounded-full"
                onClick={() => setShowForm(true)}
              >
                <Plus className="h-4 w-4" />
                <Trans>Create Environment</Trans>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {environments.map((env) => (
            <Card key={env.id} className="rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{env.name}</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(env.id)}
                      aria-label={t`Delete`}
                    >
                      {confirmDeleteId === env.id ? (
                        <span className="text-xs text-destructive">
                          <Trans>Confirm?</Trans>
                        </span>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t`Delete`}</TooltipContent>
                </Tooltip>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    <Trans>Allowed domains</Trans>
                  </span>
                </div>
                {env.allowedDomains.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {env.allowedDomains.map((domain) => (
                      <Badge key={domain} variant="secondary" className="rounded-full text-xs">
                        {domain}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic text-muted-foreground">
                    <Trans>None configured</Trans>
                  </p>
                )}
                <DateDisplay date={env.createdAt} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
};

export const Route = createFileRoute("/environments")({
  component: EnvironmentsPage,
});
