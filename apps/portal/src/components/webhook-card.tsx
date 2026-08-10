import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import {
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { WebhookDeliveryLog } from "@/components/webhook-delivery-log";
import { WebhookPreview } from "@/components/webhook-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTestWebhook } from "@/hooks/use-test-webhook";
import { useToggleWebhook } from "@/hooks/use-webhook-mutations";
import type { WebhookConfig } from "@/types/webhook";

const FORMAT_LABELS: Record<string, string> = {
  standard: "JSON",
  slack: "Slack",
  discord: "Discord",
  "google-chat": "Google Chat",
  "ms-teams": "MS Teams",
  custom: "Custom",
};

interface WebhookCardProps {
  webhook: WebhookConfig;
  projectId: string;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export const WebhookCard = ({
  webhook,
  projectId,
  isAdmin,
  onEdit,
  onDelete,
}: WebhookCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const toggleWebhook = useToggleWebhook();
  const testWebhook = useTestWebhook();

  const maskedUrl = webhook.url.replace(/(https:\/\/[^/]+)(.*)/, "$1/•••");

  return (
    <div className="rounded-lg border p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="shrink-0"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{webhook.name}</span>
            <Badge
              variant={webhook.enabled ? "default" : "secondary"}
              className="text-[10px] px-1.5 py-0 rounded-full"
            >
              {webhook.enabled ? <Trans>Active</Trans> : <Trans>Paused</Trans>}
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 rounded-full"
            >
              {FORMAT_LABELS[webhook.format] ?? webhook.format}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono truncate">
            {maskedUrl}
          </p>
        </div>

        {/* Actions */}
        {isAdmin && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() =>
                toggleWebhook.mutate({
                  projectId,
                  webhookId: webhook.id,
                  enabled: !webhook.enabled,
                })
              }
              aria-label={webhook.enabled ? t`Pause` : t`Enable`}
            >
              <span
                className={`h-2 w-2 rounded-full ${webhook.enabled ? "bg-emerald-500" : "bg-muted-foreground"}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() =>
                testWebhook.mutate({ projectId, webhookId: webhook.id })
              }
              aria-label={t`Test`}
              disabled={testWebhook.isPending}
            >
              <FlaskConical className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onEdit}
              aria-label={t`Edit`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onDelete}
              aria-label={t`Delete`}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        )}
      </div>

      {/* Filter chips */}
      {(webhook.eventTypes.length > 0 ||
        webhook.resourceCategories.length > 0 ||
        webhook.environments.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {webhook.eventTypes.map((e) => (
            <Badge
              key={e}
              variant="secondary"
              className="text-[10px] px-1.5 py-0 rounded-full"
            >
              {e}
            </Badge>
          ))}
          {webhook.resourceCategories.map((c) => (
            <Badge
              key={c}
              variant="secondary"
              className="text-[10px] px-1.5 py-0 rounded-full"
            >
              {c}
            </Badge>
          ))}
          {webhook.environments.map((env) => (
            <Badge
              key={env}
              variant="outline"
              className="text-[10px] px-1.5 py-0 rounded-full font-mono"
            >
              {env}
            </Badge>
          ))}
        </div>
      )}

      {/* Expanded: delivery log + preview */}
      {expanded && (
        <div className="space-y-3 pt-1 border-t">
          <WebhookPreview webhook={webhook} />
          <WebhookDeliveryLog projectId={projectId} webhookId={webhook.id} />
        </div>
      )}
    </div>
  );
};
