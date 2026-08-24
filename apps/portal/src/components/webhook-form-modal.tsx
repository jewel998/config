import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useState } from "react";

import { ResponsiveModal } from "@/components/responsive-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEnvironments } from "@/hooks/use-environments";
import type { WebhookConfig } from "@/types/webhook";

type WebhookFormat = WebhookConfig["format"];

const EVENT_TYPES = ["create", "update", "delete", "state_change"] as const;
const RESOURCE_CATEGORIES = [
  "config",
  "segment",
  "api_key",
  "project",
  "team",
  "environment",
] as const;

interface WebhookFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  editingWebhook?: WebhookConfig;
  onSubmit: (data: {
    name: string;
    url: string;
    format: WebhookFormat;
    eventTypes: string[];
    resourceCategories: string[];
    environments: string[];
    customTemplate?: string;
  }) => void;
}

export const WebhookFormModal = ({
  open,
  onOpenChange,
  projectId,
  editingWebhook,
  onSubmit,
}: WebhookFormModalProps) => {
  const [name, setName] = useState(editingWebhook?.name ?? "");
  const [url, setUrl] = useState(editingWebhook?.url ?? "");
  const [format, setFormat] = useState<WebhookFormat>(editingWebhook?.format ?? "standard");
  const [customTemplate, setCustomTemplate] = useState(editingWebhook?.customTemplate ?? "");
  const [eventTypes, setEventTypes] = useState<string[]>(editingWebhook?.eventTypes ?? []);
  const [resourceCategories, setResourceCategories] = useState<string[]>(
    editingWebhook?.resourceCategories ?? [],
  );
  const [environments, setEnvironments] = useState<string[]>(editingWebhook?.environments ?? []);
  const [urlError, setUrlError] = useState("");

  const { data: envs = [] } = useEnvironments(projectId);

  const toggleItem = (arr: string[], item: string, setter: (v: string[]) => void) => {
    setter(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  };

  const handleSubmit = () => {
    if (!url.startsWith("https://")) {
      setUrlError(t`URL must use HTTPS`);
      return;
    }
    setUrlError("");
    onSubmit({
      name: name.trim(),
      url: url.trim(),
      format,
      eventTypes,
      resourceCategories,
      environments,
      ...(format === "custom" ? { customTemplate } : {}),
    });
    onOpenChange(false);
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={editingWebhook ? <Trans>Edit Webhook</Trans> : <Trans>Add Webhook</Trans>}
      description={<Trans>Configure an HTTP endpoint to receive notifications.</Trans>}
    >
      <div className="space-y-4">
        {/* Name */}
        <div className="space-y-1">
          <label className="text-xs font-medium">
            <Trans>Name</Trans>
          </label>
          <Input
            placeholder={t`e.g., Slack #deployments`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        {/* URL */}
        <div className="space-y-1">
          <label className="text-xs font-medium">
            <Trans>URL (HTTPS)</Trans>
          </label>
          <Input
            placeholder="https://hooks.slack.com/services/..."
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setUrlError("");
            }}
          />
          {urlError && <p className="text-xs text-destructive">{urlError}</p>}
        </div>

        {/* Format */}
        <div className="space-y-1">
          <label className="text-xs font-medium">
            <Trans>Format</Trans>
          </label>
          <Select value={format} onValueChange={(v) => setFormat(v as WebhookFormat)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">
                <Trans>Standard JSON</Trans>
              </SelectItem>
              <SelectItem value="slack">
                <Trans>Slack</Trans>
              </SelectItem>
              <SelectItem value="discord">
                <Trans>Discord</Trans>
              </SelectItem>
              <SelectItem value="google-chat">
                <Trans>Google Chat</Trans>
              </SelectItem>
              <SelectItem value="ms-teams">
                <Trans>Microsoft Teams</Trans>
              </SelectItem>
              <SelectItem value="custom">
                <Trans>Custom Template</Trans>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Template */}
        {format === "custom" && (
          <div className="space-y-2">
            <label className="text-xs font-medium">
              <Trans>Message Template</Trans>
            </label>
            <Textarea
              placeholder="{{actor.id}} {{action}} {{resource.name}} in {{environment}}"
              value={customTemplate}
              onChange={(e) => setCustomTemplate(e.target.value)}
              className="min-h-24 font-mono text-xs"
            />
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer font-medium">
                <Trans>Available Variables</Trans>
              </summary>
              <div className="mt-2 space-y-1 pl-2 border-l">
                <p>
                  <code>{"{{action}}"}</code> — create, update, delete, state_change
                </p>
                <p>
                  <code>{"{{resource.category}}"}</code> — config, segment, api_key, etc.
                </p>
                <p>
                  <code>{"{{resource.path}}"}</code> — full resource path
                </p>
                <p>
                  <code>{"{{resource.name}}"}</code> — human-readable resource name
                </p>
                <p>
                  <code>{"{{environment}}"}</code> — environment name or empty
                </p>
                <p>
                  <code>{"{{actor.id}}"}</code> — user ID of the actor
                </p>
                <p>
                  <code>{"{{timestamp}}"}</code> — ISO 8601 timestamp
                </p>
                <p>
                  <code>{"{{project.id}}"}</code> — project ID
                </p>
                <p>
                  <code>{"{{webhook.id}}"}</code> — webhook ID
                </p>
                <p>
                  <code>{"{{changes.old}}"}</code> — previous value (JSON string)
                </p>
                <p>
                  <code>{"{{changes.new}}"}</code> — new value (JSON string)
                </p>
              </div>
            </details>
          </div>
        )}

        {/* Event Type Filters */}
        <div className="space-y-1">
          <label className="text-xs font-medium">
            <Trans>Event types</Trans> <span className="text-muted-foreground">(empty = all)</span>
          </label>
          <div className="flex flex-wrap gap-1">
            {EVENT_TYPES.map((et) => (
              <Badge
                key={et}
                variant={eventTypes.includes(et) ? "default" : "outline"}
                className="cursor-pointer text-xs rounded-full"
                onClick={() => toggleItem(eventTypes, et, setEventTypes)}
              >
                {et}
              </Badge>
            ))}
          </div>
        </div>

        {/* Resource Category Filters */}
        <div className="space-y-1">
          <label className="text-xs font-medium">
            <Trans>Resource categories</Trans>{" "}
            <span className="text-muted-foreground">(empty = all)</span>
          </label>
          <div className="flex flex-wrap gap-1">
            {RESOURCE_CATEGORIES.map((rc) => (
              <Badge
                key={rc}
                variant={resourceCategories.includes(rc) ? "default" : "outline"}
                className="cursor-pointer text-xs rounded-full"
                onClick={() => toggleItem(resourceCategories, rc, setResourceCategories)}
              >
                {rc}
              </Badge>
            ))}
          </div>
        </div>

        {/* Environment Filters */}
        <div className="space-y-1">
          <label className="text-xs font-medium">
            <Trans>Environments</Trans> <span className="text-muted-foreground">(empty = all)</span>
          </label>
          <div className="flex flex-wrap gap-1">
            {envs.map((env) => (
              <Badge
                key={env.id}
                variant={environments.includes(env.name) ? "default" : "outline"}
                className="cursor-pointer text-xs rounded-full"
                onClick={() => toggleItem(environments, env.name, setEnvironments)}
              >
                {env.name}
              </Badge>
            ))}
            {envs.length === 0 && (
              <span className="text-xs text-muted-foreground">
                <Trans>No environments configured</Trans>
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            className="rounded-full"
            onClick={handleSubmit}
            disabled={!name.trim() || !url.trim()}
          >
            {editingWebhook ? <Trans>Save</Trans> : <Trans>Create</Trans>}
          </Button>
          <Button variant="ghost" className="rounded-full" onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
};
