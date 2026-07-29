import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { HelpCircle, Pencil, Plus, Settings, Trash2 } from "lucide-react";
import { marked } from "marked";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { ColorPicker } from "@/components/color-picker";
import { CopyButton } from "@/components/copy-button";
import { DateDisplay } from "@/components/date-display";
import { EmptyState } from "@/components/empty-state";
import { EnvironmentForm } from "@/components/environment-form";
import { PageHeader } from "@/components/page-header";
import { SegmentedControl } from "@/components/segmented-control";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useEnvironments,
  useCreateEnvironment,
  useDeleteEnvironment,
  useUpdateEnvironment,
} from "@/hooks/use-environments";
import { useUpdateProjectDescription } from "@/hooks/use-project-description";
import { useDeleteProject, useProjects } from "@/hooks/use-projects";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectStore } from "@/stores/project-store";

// --- Sub-components ---

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

// --- Description Section ---

const DescriptionSection = ({
  projectId,
  currentDescription,
}: {
  projectId: string;
  currentDescription: string;
}) => {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(currentDescription);
  const [descTab, setDescTab] = useState<"write" | "preview">("write");
  const updateDescription = useUpdateProjectDescription();

  const handleSave = () => {
    updateDescription.mutate(
      { projectId, description },
      { onSuccess: () => setEditing(false) },
    );
  };

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          <Trans>Description</Trans>
        </CardTitle>
        <Button
          size="sm"
          variant="ghost"
          className="rounded-full"
          onClick={() => {
            if (!editing) setDescription(currentDescription);
            setEditing(!editing);
          }}
        >
          {editing ? <Trans>Cancel</Trans> : <Trans>Edit</Trans>}
        </Button>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            <SegmentedControl
              value={descTab}
              onChange={setDescTab}
              options={[
                { value: "write", label: <Trans>Write</Trans> },
                { value: "preview", label: <Trans>Preview</Trans> },
              ]}
              size="sm"
            />
            {descTab === "write" ? (
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t`Project description (markdown supported)`}
                className="min-h-32 font-mono text-sm"
              />
            ) : (
              <div
                className="prose prose-sm dark:prose-invert min-h-32 rounded-lg border p-4"
                dangerouslySetInnerHTML={{
                  __html: marked(description || "") as string,
                }}
              />
            )}
            <Button
              size="sm"
              className="rounded-full"
              onClick={handleSave}
              disabled={updateDescription.isPending}
            >
              {updateDescription.isPending ? <Spinner /> : <Trans>Save</Trans>}
            </Button>
          </div>
        ) : currentDescription ? (
          <div
            className="prose prose-sm dark:prose-invert"
            dangerouslySetInnerHTML={{
              __html: marked(currentDescription) as string,
            }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {t`No description yet.`}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// --- Environments Section ---

const EnvironmentsSection = ({ projectId }: { projectId: string }) => {
  const { data: environments = [] } = useEnvironments(projectId);
  const createEnv = useCreateEnvironment();
  const deleteEnv = useDeleteEnvironment();
  const updateEnv = useUpdateEnvironment();

  const [showForm, setShowForm] = useState(false);
  const [editingEnvId, setEditingEnvId] = useState<string | null>(null);

  const handleCreate = (values: {
    name: string;
    allowedDomains: string[];
    color: string;
    isProduction: boolean;
  }) => {
    createEnv.mutate(
      { projectId, ...values },
      {
        onSuccess: () => {
          setShowForm(false);
          toast.success(t`Environment created`);
        },
        onError: () => toast.error(t`Failed to create environment`),
      },
    );
  };

  const handleUpdate = (
    envId: string,
    values: {
      name: string;
      allowedDomains: string[];
      color: string;
      isProduction: boolean;
    },
  ) => {
    updateEnv.mutate(
      { projectId, envId, data: values },
      {
        onSuccess: () => {
          setEditingEnvId(null);
          toast.success(t`Environment updated`);
        },
        onError: () => toast.error(t`Failed to update environment`),
      },
    );
  };

  const handleDelete = (envId: string) => {
    const env = environments.find((e) => e.id === envId);
    deleteEnv.mutate(
      { projectId, envId },
      {
        onSuccess: () => {
          toast.success(t`Environment deleted`, {
            action: {
              label: t`Undo`,
              onClick: () => {
                if (env) {
                  createEnv.mutate({
                    projectId,
                    name: env.name,
                    allowedDomains: env.allowedDomains,
                    color: env.color,
                    isProduction: env.isProduction,
                  });
                }
              },
            },
            duration: 5000,
          });
        },
        onError: () => toast.error(t`Failed to delete environment`),
      },
    );
  };

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base">
          <Trans>Environments</Trans>
        </CardTitle>
        <Button
          size="sm"
          className="rounded-full gap-2"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          <Trans>Add</Trans>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <EnvironmentForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            isPending={createEnv.isPending}
            submitLabel={<Trans>Create</Trans>}
          />
        )}

        {environments.length === 0 && !showForm && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            <Trans>No environments yet.</Trans>
          </p>
        )}

        {environments.map((env) => (
          <div key={env.id}>
            {editingEnvId === env.id ? (
              <EnvironmentForm
                initialValues={{
                  name: env.name,
                  allowedDomains: env.allowedDomains,
                  color: env.color,
                  isProduction: env.isProduction,
                }}
                onSubmit={(values) => handleUpdate(env.id, values)}
                onCancel={() => setEditingEnvId(null)}
                isPending={updateEnv.isPending}
              />
            ) : (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: env.color || "#9ca3af" }}
                    />
                    <p className="text-sm font-medium">{env.name}</p>
                    {env.isProduction && (
                      <Badge
                        variant="secondary"
                        className="rounded-full text-xs"
                      >
                        <Trans>Production</Trans>
                      </Badge>
                    )}
                  </div>
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
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setEditingEnvId(env.id)}
                        aria-label={t`Edit`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t`Edit`}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDelete(env.id)}
                        aria-label={t`Delete`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t`Delete`}</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// --- Danger Zone ---

const DangerZone = ({ projectId }: { projectId: string }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteProject = useDeleteProject();
  const setSelectedProjectId = useProjectStore((s) => s.setSelectedProjectId);

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 5000);
      return;
    }
    deleteProject.mutate(projectId, {
      onSuccess: () => {
        setSelectedProjectId(null);
        toast.success(t`Project deleted`);
      },
      onError: () => toast.error(t`Failed to delete project`),
    });
  };

  return (
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
  );
};

// --- Main Page ---

const SettingsPage = () => {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const user = useAuthStore((s) => s.user);
  const { data: projects, isLoading } = useProjects();

  const selectedProject = projects?.find((p) => p.id === selectedProjectId);

  if (!selectedProjectId) {
    return (
      <EmptyState
        icon={Settings}
        message={<Trans>Select a project to view settings.</Trans>}
      />
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
      <EmptyState
        icon={Settings}
        message={<Trans>Project not found.</Trans>}
      />
    );
  }

  const ownerEmail =
    selectedProject.ownerId === user?.uid
      ? (user?.email ?? selectedProject.ownerId)
      : selectedProject.ownerId;
  const ownerIsNotYou = selectedProject.ownerId !== user?.uid;

  return (
    <div className="space-y-6">
      <PageHeader
        title={<Trans>Project Settings</Trans>}
        description={<Trans>Manage project configuration and team access.</Trans>}
      />

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

      <DescriptionSection
        projectId={selectedProjectId}
        currentDescription={selectedProject.description || ""}
      />

      <EnvironmentsSection projectId={selectedProjectId} />

      <DangerZone projectId={selectedProjectId} />
    </div>
  );
};

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});
