import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Eye, EyeOff, Key, Plus, ShieldOff, Trash2, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DateDisplay } from "@/components/date-display";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PageLayout } from "@/components/page-layout";
import { PageTourButton } from "@/components/page-tour-button";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  useApiKeys,
  useDeleteApiKey,
  useGenerateApiKey,
  useRevokeApiKey,
} from "@/hooks/use-api-keys";
import { useRBAC } from "@/hooks/use-rbac";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectStore } from "@/stores/project-store";

// ═══════════════════════════════════════════════════════════════
// Generate Key Modal
// ═══════════════════════════════════════════════════════════════

const GenerateKeyModal = ({
  open,
  onOpenChange,
  projectId,
  environmentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  environmentId: string;
}) => {
  const generateKey = useGenerateApiKey();
  const [label, setLabel] = useState("");
  const [keyType, setKeyType] = useState<"client" | "server">("client");

  const handleGenerate = () => {
    generateKey.mutate(
      { projectId, environmentId, label: label.trim() || undefined, keyType },
      {
        onSuccess: () => {
          toast.success(t`API key generated`);
          setLabel("");
          setKeyType("client");
          onOpenChange(false);
        },
        onError: () => {
          toast.error(t`Failed to generate API key`);
        },
      },
    );
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={<Trans>Generate API Key</Trans>}
      description={<Trans>Create a new key to authenticate SDK requests.</Trans>}
    >
      <div className="space-y-4">
        {/* Key Type */}
        <div className="space-y-2">
          <Label>
            <Trans>Key Type</Trans>
          </Label>
          <div className="flex items-center gap-1 rounded-lg border p-1">
            <button
              type="button"
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${keyType === "client" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              onClick={() => setKeyType("client")}
            >
              <Trans>Client</Trans>
              <span className="ml-1.5 text-xs opacity-70">(cid_)</span>
            </button>
            <button
              type="button"
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${keyType === "server" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              onClick={() => setKeyType("server")}
            >
              <Trans>Server</Trans>
              <span className="ml-1.5 text-xs opacity-70">(svr_)</span>
            </button>
          </div>
        </div>

        {/* Label */}
        <div className="space-y-2">
          <Label>
            <Trans>Label (optional)</Trans>
          </Label>
          <Input
            placeholder={t`e.g., Production Frontend, Backend Worker`}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            className="rounded-full"
            onClick={handleGenerate}
            disabled={generateKey.isPending}
          >
            {generateKey.isPending ? <Spinner /> : <Trans>Generate</Trans>}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
};

// ═══════════════════════════════════════════════════════════════
// Masked Token Display
// ═══════════════════════════════════════════════════════════════

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
            {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
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

// ═══════════════════════════════════════════════════════════════
// Environment Keys List
// ═══════════════════════════════════════════════════════════════

const EnvironmentKeys = ({
  projectId,
  environmentId,
  readOnly,
}: {
  projectId: string;
  environmentId: string;
  readOnly?: boolean;
}) => {
  const { data: keys = [], isLoading } = useApiKeys(projectId, environmentId);
  const revokeKey = useRevokeApiKey();
  const deleteKey = useDeleteApiKey();
  const user = useAuthStore((s) => s.user);
  const [modalOpen, setModalOpen] = useState(false);

  const handleRevoke = (token: string) => {
    revokeKey.mutate(
      { projectId, environmentId, token },
      {
        onSuccess: () => toast.success(t`API key revoked`),
        onError: () => toast.error(t`Failed to revoke API key`),
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
    <>
      <Card className="rounded-xl">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            <Trans>API Keys</Trans>
          </CardTitle>
          {!readOnly && (
            <Button
              className="min-w-20 gap-2 rounded-full shrink-0"
              size="sm"
              onClick={() => setModalOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              <Trans>Generate Key</Trans>
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {keys.length === 0 ? (
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
                        variant={key.status === "active" ? "default" : "secondary"}
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
                              <span className="truncate">{user?.displayName ?? "You"}</span>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{user?.displayName ?? user?.email}</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {key.label && <span>{key.label}</span>}
                      <DateDisplay date={key.createdAt} />
                      {key.status === "revoked" && key.revokedAt && (
                        <span>
                          <Trans>Revoked</Trans> <DateDisplay date={key.revokedAt} />
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {key.status === "active" && !readOnly && (
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
                    {key.status === "revoked" && !readOnly && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="min-w-20 gap-1.5 rounded-full text-destructive hover:text-destructive"
                            onClick={() => {
                              deleteKey.mutate(
                                {
                                  projectId,
                                  environmentId,
                                  token: key.token,
                                },
                                {
                                  onSuccess: () => toast.success(t`Key deleted permanently`),
                                  onError: () => toast.error(t`Failed to delete key`),
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

      <GenerateKeyModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        projectId={projectId}
        environmentId={environmentId}
      />
    </>
  );
};

// ═══════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════

const ApiKeysPage = () => {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const selectedEnvironmentId = useProjectStore((s) => s.selectedEnvironmentId);
  const { role } = useRBAC();
  const isViewer = role === "viewer";

  if (!selectedProjectId) {
    return <EmptyState icon={Key} message={<Trans>Select a project to manage API keys.</Trans>} />;
  }

  if (!selectedEnvironmentId) {
    return (
      <EmptyState
        icon={Key}
        message={<Trans>Select an environment from the top bar to manage API keys.</Trans>}
      />
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title={<Trans>API Keys</Trans>}
        description={
          <Trans>Manage keys for this environment. Use these to authenticate SDK requests.</Trans>
        }
        actions={<PageTourButton flowId="tour-api-keys" label={t`API Keys guide`} />}
      />

      <EnvironmentKeys
        projectId={selectedProjectId}
        environmentId={selectedEnvironmentId}
        readOnly={isViewer}
      />
    </PageLayout>
  );
};

export const Route = createFileRoute("/api-keys")({
  component: ApiKeysPage,
});
