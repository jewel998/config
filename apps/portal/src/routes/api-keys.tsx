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
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PageLayout } from "@/components/page-layout";
import { PageTourButton } from "@/components/page-tour-button";
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
import { useAuthStore } from "@/stores/auth-store";
import { useProjectStore } from "@/stores/project-store";
import { useRBAC } from "@/hooks/use-rbac";

const MaskedToken = ({ token }: { token: string }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <code className="truncate font-mono text-xs">
        {visible ? token : `${token.slice(0, 8)}${"•".repeat(12)}`}
      </code>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            className="shrink-0"
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
            size="icon-xs"
            className="shrink-0"
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
  readOnly,
}: {
  projectId: string;
  environmentId: string;
  environmentName: string;
  readOnly?: boolean;
}) => {
  const { data: keys = [], isLoading } = useApiKeys(projectId, environmentId);
  const generateKey = useGenerateApiKey();
  const revokeKey = useRevokeApiKey();
  const deleteKey = useDeleteApiKey();
  const user = useAuthStore((s) => s.user);
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [label, setLabel] = useState("");
  const [keyType, setKeyType] = useState<"client" | "server">("client");

  const handleGenerate = () => {
    generateKey.mutate(
      { projectId, environmentId, label: label.trim() || undefined, keyType },
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
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="text-base">{environmentName}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            <Trans>
              <strong>Client keys</strong> (
              <code className="font-mono">cid_</code>) — for frontend apps.
              Returns only resolved values.
              <br />
              <strong>Server keys</strong> (
              <code className="font-mono">svr_</code>) — for backend services.
              Returns full flag data for local evaluation.
            </Trans>
          </p>
        </div>
        <Button
          className="min-w-20 gap-2 rounded-full shrink-0"
          size="sm"
          onClick={() => setShowLabelInput(true)}
          disabled={showLabelInput || readOnly}
        >
          <Plus className="h-3.5 w-3.5" />
          <Trans>Generate Key</Trans>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showLabelInput && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-1 rounded-full border p-0.5">
              <button
                type="button"
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${keyType === "client" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setKeyType("client")}
              >
                Client
              </button>
              <button
                type="button"
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${keyType === "server" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setKeyType("server")}
              >
                Server
              </button>
            </div>
            <Input
              placeholder={t`Label (optional)`}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              className="w-full sm:max-w-xs"
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
                className="rounded-lg border p-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <MaskedToken token={key.token} />
                    <Badge
                      variant={
                        key.status === "active" ? "default" : "secondary"
                      }
                      className="rounded-full text-xs"
                    >
                      {key.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`rounded-full text-xs ${key.token.startsWith("svr_") ? "border-amber-500/50 text-amber-600 dark:text-amber-400" : "border-blue-500/50 text-blue-600 dark:text-blue-400"}`}
                    >
                      {key.token.startsWith("svr_") ? "Server" : "Client"}
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
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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
                <div className="flex shrink-0 items-center gap-2">
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
  const selectedEnvironmentId = useProjectStore((s) => s.selectedEnvironmentId);
  const { role } = useRBAC();
  const isViewer = role === "viewer";

  if (!selectedProjectId) {
    return (
      <EmptyState
        icon={Key}
        message={<Trans>Select a project to manage API keys.</Trans>}
      />
    );
  }

  if (!selectedEnvironmentId) {
    return (
      <EmptyState
        icon={Key}
        message={
          <Trans>
            Select an environment from the top bar to manage API keys.
          </Trans>
        }
      />
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title={<Trans>API Keys</Trans>}
        description={
          <Trans>
            Manage client IDs for this environment. Use these keys to
            authenticate SDK requests.
          </Trans>
        }
        actions={
          <PageTourButton flowId="tour-api-keys" label={t`API Keys guide`} />
        }
      />

      <EnvironmentKeys
        projectId={selectedProjectId}
        environmentId={selectedEnvironmentId}
        environmentName=""
        readOnly={isViewer}
      />
    </PageLayout>
  );
};

export const Route = createFileRoute("/api-keys")({
  component: ApiKeysPage,
});
