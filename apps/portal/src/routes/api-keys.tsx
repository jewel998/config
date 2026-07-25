import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Eye, EyeOff, Key, Plus, ShieldOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  useApiKeys,
  useGenerateApiKey,
  useRevokeApiKey,
} from "@/hooks/use-api-keys";
import { useEnvironments } from "@/hooks/use-environments";
import { useProjectStore } from "@/stores/project-store";

const MaskedToken = ({ token }: { token: string }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <code className="font-mono text-xs">
        {visible ? token : `${token.slice(0, 8)}${"•".repeat(16)}`}
      </code>
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
        <CardTitle className="text-base">{environmentName}</CardTitle>
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
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {key.label && <span>{key.label}</span>}
                    <span className="font-mono">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {key.status === "active" && (
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
                )}
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
