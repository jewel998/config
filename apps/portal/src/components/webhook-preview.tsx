import { Trans } from "@lingui/react/macro";
import { Eye } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { WebhookConfig } from "@/types/webhook";

/**
 * Generates a sample payload preview for a webhook based on its format.
 */
function generateSamplePayload(webhook: WebhookConfig): unknown {
  const sample = {
    action: "update",
    resourceCategory: "config",
    resourcePath: "environments/production/configs/feature.dark_mode",
    resourceName: "feature.dark_mode",
    environment: "production",
    actorId: "user_abc123",
    timestamp: new Date().toISOString(),
    oldValue: { value: false },
    newValue: { value: true },
    projectId: "proj_xyz",
    webhookId: webhook.id,
  };

  switch (webhook.format) {
    case "slack":
      return {
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "🔵 Config Updated" },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: "*Resource:*\nfeature.dark_mode" },
              { type: "mrkdwn", text: "*Environment:*\nproduction" },
            ],
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: "*Action:*\nupdate" },
              { type: "mrkdwn", text: "*Actor:*\nuser_abc123" },
            ],
          },
          {
            type: "context",
            elements: [{ type: "mrkdwn", text: `${sample.timestamp} • proj_xyz` }],
          },
        ],
      };

    case "discord":
      return {
        embeds: [
          {
            title: "🔔 Config Updated",
            color: 0x5865f2,
            fields: [
              { name: "Resource", value: "feature.dark_mode", inline: true },
              { name: "Environment", value: "production", inline: true },
              { name: "Action", value: "update", inline: true },
              { name: "Actor", value: "user_abc123", inline: true },
            ],
            footer: { text: `${sample.timestamp} • proj_xyz` },
          },
        ],
      };

    case "google-chat":
      return {
        cardsV2: [
          {
            cardId: webhook.id,
            card: {
              header: {
                title: "Config Updated",
                subtitle: "feature.dark_mode",
              },
              sections: [
                {
                  widgets: [
                    { decoratedText: { topLabel: "Action", text: "update" } },
                    {
                      decoratedText: {
                        topLabel: "Environment",
                        text: "production",
                      },
                    },
                    {
                      decoratedText: { topLabel: "Actor", text: "user_abc123" },
                    },
                  ],
                },
              ],
            },
          },
        ],
      };

    case "ms-teams":
      return {
        type: "message",
        attachments: [
          {
            contentType: "application/vnd.microsoft.card.adaptive",
            content: {
              type: "AdaptiveCard",
              version: "1.4",
              body: [
                {
                  type: "TextBlock",
                  text: "🔔 Config Updated",
                  weight: "Bolder",
                },
                {
                  type: "FactSet",
                  facts: [
                    { title: "Resource", value: "feature.dark_mode" },
                    { title: "Environment", value: "production" },
                    { title: "Action", value: "update" },
                  ],
                },
              ],
            },
          },
        ],
      };

    case "custom":
      if (webhook.customTemplate) {
        const interpolated = webhook.customTemplate
          .replace(/\{\{action\}\}/g, "update")
          .replace(/\{\{resource\.name\}\}/g, "feature.dark_mode")
          .replace(/\{\{resource\.category\}\}/g, "config")
          .replace(/\{\{environment\}\}/g, "production")
          .replace(/\{\{actor\.id\}\}/g, "user_abc123")
          .replace(/\{\{timestamp\}\}/g, sample.timestamp)
          .replace(/\{\{project\.id\}\}/g, "proj_xyz")
          .replace(/\{\{webhook\.id\}\}/g, webhook.id);
        try {
          return JSON.parse(interpolated);
        } catch {
          return { text: interpolated };
        }
      }
      return { text: "No template configured" };

    default:
      return sample;
  }
}

interface WebhookPreviewProps {
  webhook: WebhookConfig;
}

export const WebhookPreview = ({ webhook }: WebhookPreviewProps) => {
  const [show, setShow] = useState(false);

  const payload = useMemo(() => {
    return JSON.stringify(generateSamplePayload(webhook), null, 2);
  }, [webhook]);

  if (!show) {
    return (
      <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setShow(true)}>
        <Eye className="h-3 w-3" />
        <Trans>Preview payload</Trans>
      </Button>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          <Trans>Sample payload</Trans>
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 text-[10px]"
          onClick={() => setShow(false)}
        >
          <Trans>Hide</Trans>
        </Button>
      </div>
      <pre className="text-[11px] font-mono bg-muted/50 rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto">
        {payload}
      </pre>
    </div>
  );
};
