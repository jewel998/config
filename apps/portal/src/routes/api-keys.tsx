import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import {
  Copy,
  Eye,
  EyeOff,
  Key,
  Plus,
  ShieldOff,
  Trash2,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
  useApiKeys,
  useDeleteApiKey,
  useGenerateApiKey,
  useRevokeApiKey,
} from "@/hooks/use-api-keys";
import { useEnvironments } from "@/hooks/use-environments";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectStore } from "@/stores/project-store";

const MaskedToken = ({ token }: { token: string }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <code className="font-mono text-xs">
        {visible ? token : `${token.slice(0, 8)}${"•".repeat(16)}`}
      </code>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setVisible(!visible)}
            aria-label={visible ? "Hide token" : "Show token"}
          >
            {visible ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{visible ? t`Hide` : t`Show`}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              navigator.clipboard.writeText(token);
              toast.success(t`Copied to clipboard`);
            }}
            aria-label="Copy token"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t`Copy`}</TooltipContent>
      </Tooltip>
    </div>
  );
};

const EnvironmentKeys = ({
  projectId,
  environmentId,
  environmentName,
}: {
  projectId: string;
  environmentId: string;
  environmentName: string;
}) => {
  const { data: keys = [], isLoading } = useApiKeys(projectId, environmentId);
  const generateKey = useGenerateApiKey();
  const revokeKey = useRevokeApiKey();
  const deleteKey = useDeleteApiKey();
  const user = useAuthStore((s) => s.user);
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [label, setLabel] = useState("");

  const handleGenerate = () => {
    generateKey.mutate(
      { projectId, environmentId, label: label.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(t`API key generated`);
          setLabel("");
          setShowLabelInput(false);
        },
        onError: () => {
          toast.error(t`Failed to generate API key`);
        },
      },
    );
  };

  const handleRevoke = (token: string) => {
    revokeKey.mutate(
      { projectId, environmentId, token },
      {
        onSuccess: () => {
          toast.success(t`API key revoked`);
        },
        onError: () => {
          toast.error(t`Failed to revoke API key`);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <Card className="rounded-xl">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">{environmentName}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            <Trans>
              Keys are prefixed with <code className="font-mono">cid_</code> and
              contain 20 random characters.
            </Trans>
          </p>
        </div>
        <Button
          className="min-w-20 gap-2 rounded-full"
          size="sm"
          onClick={() => setShowLabelInput(true)}
          disabled={showLabelInput}
        >
          <Plus className="h-3.5 w-3.5" />
          <Trans>Generate Key</Trans>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showLabelInput && (
          <div className="flex items-center gap-2">
            <Input
              placeholder={t`Label (optional)`}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              className="max-w-xs"
              autoFocus
            />
            <Button
              className="min-w-20 rounded-full"
              size="sm"
              onClick={handleGenerate}
              disabled={generateKey.isPending}
            >
              {generateKey.isPending ? <Spinner /> : <Trans>Create</Trans>}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={() => {
                setShowLabelInput(false);
                setLabel("");
              }}
            >
              <Trans>Cancel</Trans>
            </Button>
          </div>
        )}

        {keys.length === 0 && !showLabelInput ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            <Trans>No API keys yet. Generate one to get started.</Trans>
          </p>
        ) : (
          <div className="space-y-3">
            {keys.map((key) => (
              <div
                key={key.token}
                className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <MaskedToken token={key.token} />
                    <Badge
                      variant={
                        key.status === "active" ? "default" : "secondary"
                      }
                      className="rounded-full text-xs"
                    >
                      {key.status}
                    </Badge>
                    {key.createdBy === user?.uid && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex max-w-28 items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                            <User className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              {user?.displayName ?? "You"}
                            </span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {user?.displayName ?? user?.email}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {key.label && <span>{key.label}</span>}
                    <DateDisplay date={key.createdAt} />
                    {key.status === "revoked" && key.revokedAt && (
                      <span>
                        <Trans>Revoked</Trans>{" "}
                        <DateDisplay date={key.revokedAt} />
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {key.status === "active" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-w-20 gap-1.5 rounded-full text-destructive hover:text-destructive"
                          onClick={() => handleRevoke(key.token)}
                          disabled={revokeKey.isPending}
                        >
                          {revokeKey.isPending ? (
                            <Spinner />
                          ) : (
                            <>
                              <ShieldOff className="h-3.5 w-3.5" />
                              <Trans>Revoke</Trans>
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t`Revoke key`}</TooltipContent>
                    </Tooltip>
                  )}
                  {key.status === "revoked" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="min-w-20 gap-1.5 rounded-full text-destructive hover:text-destructive"
                          onClick={() => {
                            deleteKey.mutate(
                              { projectId, environmentId, token: key.token },
                              {
                                onSuccess: () => {
                                  toast.success(t`Key deleted permanently`);
                                },
                                onError: () => {
                                  toast.error(t`Failed to delete key`);
                                },
                              },
                            );
                          }}
                          disabled={deleteKey.isPending}
                        >
                          {deleteKey.isPending ? (
                            <Spinner />
                          ) : (
                            <>
                              <Trash2 className="h-3.5 w-3.5" />
                              <Trans>Delete</Trans>
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t`Delete`}</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ApiKeysPage = () => {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const { data: environments = [], isLoading } =
    useEnvironments(selectedProjectId);

  if (!selectedProjectId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="rounded-full bg-muted p-4">
          <Key className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          <Trans>Select a project to manage API keys.</Trans>
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          <Trans>API Keys</Trans>
        </h1>
        <p className="text-sm text-muted-foreground">
          <Trans>
            Manage client IDs for each environment. Use these keys to
            authenticate SDK requests.
          </Trans>
        </p>
      </div>

      {environments.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent>
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <div className="rounded-full bg-muted p-4">
                <Key className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                <Trans>Create an environment first to generate API keys.</Trans>
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        environments.map((env) => (
          <EnvironmentKeys
            key={env.id}
            projectId={selectedProjectId}
            environmentId={env.id}
            environmentName={env.name}
          />
        ))
      )}
    </div>
  );
};

export const Route = createFileRoute("/api-keys")({
  component: ApiKeysPage,
});
