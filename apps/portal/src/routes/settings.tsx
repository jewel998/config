import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { HelpCircle, Plus, Settings, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { CopyButton } from "@/components/copy-button";
import { DateDisplay } from "@/components/date-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useEnvironments,
  useCreateEnvironment,
  useDeleteEnvironment,
} from "@/hooks/use-environments";
import { useDeleteProject, useProjects } from "@/hooks/use-projects";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectStore } from "@/stores/project-store";

const InfoCard = ({
  label,
  value,
  copyable,
  tooltip,
}: {
  label: ReactNode;
  value: string;
  copyable?: boolean;
  tooltip?: string;
}) => (
  <div className="rounded-xl border p-4">
    <div className="flex items-center gap-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {tooltip && (
        <Tooltip>
          <TooltipTrigger>
            <HelpCircle className="h-3 w-3 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
    <div className="mt-1 flex items-center gap-2">
      <p className="font-mono text-sm">{value}</p>
      {copyable && <CopyButton value={value} />}
    </div>
  </div>
);

const SettingsPage = () => {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const setSelectedProjectId = useProjectStore((s) => s.setSelectedProjectId);
  const user = useAuthStore((s) => s.user);
  const { data: projects, isLoading } = useProjects();
  const deleteProject = useDeleteProject();

  const selectedProject = projects?.find((p) => p.id === selectedProjectId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showEnvForm, setShowEnvForm] = useState(false);
  const [envName, setEnvName] = useState("");
  const [envDomains, setEnvDomains] = useState("");
  const { data: environments = [] } = useEnvironments(selectedProjectId);
  const createEnv = useCreateEnvironment();
  const deleteEnv = useDeleteEnvironment();

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
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 5000);
      return;
    }
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

  const handleCreateEnv = () => {
    if (!envName.trim() || !selectedProjectId) return;
    const domains = envDomains
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    createEnv.mutate(
      { projectId: selectedProjectId, name: envName, allowedDomains: domains },
      {
        onSuccess: () => {
          setEnvName("");
          setEnvDomains("");
          setShowEnvForm(false);
          toast.success(t`Environment created`);
        },
        onError: () => {
          toast.error(t`Failed to create environment`);
        },
      },
    );
  };

  const handleDeleteEnv = (envId: string) => {
    if (!selectedProjectId) return;
    deleteEnv.mutate(
      { projectId: selectedProjectId, envId },
      {
        onSuccess: () => toast.success(t`Environment deleted`),
        onError: () => toast.error(t`Failed to delete environment`),
      },
    );
  };

  const ownerEmail =
    selectedProject.ownerId === user?.uid
      ? (user?.email ?? selectedProject.ownerId)
      : selectedProject.ownerId;
  const ownerIsNotYou = selectedProject.ownerId !== user?.uid;

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

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard
          label={<Trans>Project Name</Trans>}
          value={selectedProject.name}
        />
        <InfoCard
          label={<Trans>Project ID</Trans>}
          value={selectedProjectId}
          copyable
          tooltip={t`Unique identifier for API integrations`}
        />
        <div className="rounded-xl border p-4">
          <p className="text-xs font-medium text-muted-foreground">
            <Trans>Created</Trans>
          </p>
          <div className="mt-1">
            {selectedProject.createdAt ? (
              <DateDisplay date={selectedProject.createdAt} />
            ) : (
              <p className="font-mono text-sm">—</p>
            )}
          </div>
        </div>
        <InfoCard
          label={<Trans>Owner</Trans>}
          value={ownerEmail}
          copyable={ownerIsNotYou}
          tooltip={t`The user who created this project`}
        />
      </div>

      <Card className="rounded-xl">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            <Trans>Environments</Trans>
          </CardTitle>
          <Button
            size="sm"
            className="rounded-full gap-2"
            onClick={() => setShowEnvForm(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            <Trans>Add</Trans>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {showEnvForm && (
            <div className="space-y-2 rounded-lg border p-3">
              <Input
                placeholder={t`Environment name`}
                value={envName}
                onChange={(e) => setEnvName(e.target.value)}
              />
              <Input
                placeholder={t`Allowed domains (comma-separated)`}
                value={envDomains}
                onChange={(e) => setEnvDomains(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={handleCreateEnv}
                  disabled={createEnv.isPending || !envName.trim()}
                >
                  {createEnv.isPending ? <Spinner /> : <Trans>Create</Trans>}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => {
                    setShowEnvForm(false);
                    setEnvName("");
                    setEnvDomains("");
                  }}
                >
                  <Trans>Cancel</Trans>
                </Button>
              </div>
            </div>
          )}
          {environments.length === 0 && !showEnvForm && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              <Trans>No environments yet.</Trans>
            </p>
          )}
          {environments.map((env) => (
            <div
              key={env.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium">{env.name}</p>
                {env.allowedDomains.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {env.allowedDomains.map((d) => (
                      <Badge
                        key={d}
                        variant="secondary"
                        className="rounded-full text-xs"
                      >
                        {d}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleDeleteEnv(env.id)}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete</TooltipContent>
              </Tooltip>
            </div>
          ))}
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
            ) : confirmDelete ? (
              <Trans>Confirm Delete?</Trans>
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
