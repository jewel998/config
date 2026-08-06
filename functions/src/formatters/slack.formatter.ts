import type { AuditEntry, PayloadFormatter, WebhookConfig } from "../types.js";
import {
  getEnvironmentFromPath,
  getResourceCategory,
  formatResourceName,
} from "../utils/audit-utils.js";

const ACTION_EMOJI: Record<string, string> = {
  create: "🟢",
  update: "🔵",
  delete: "🔴",
  state_change: "🟡",
};

export const slackFormatter: PayloadFormatter = {
  contentType: "application/json",

  format(entry: AuditEntry, _webhook: WebhookConfig, projectId: string) {
    const action = entry.action;
    const emoji = ACTION_EMOJI[action] ?? "🔔";
    const resourceName = formatResourceName(entry.resourcePath);
    const category = getResourceCategory(entry.resourcePath);
    const environment = getEnvironmentFromPath(entry.resourcePath) ?? "—";

    const blocks: unknown[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emoji} ${capitalize(category)} ${capitalize(action)}d`,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Resource:*\n${resourceName}` },
          { type: "mrkdwn", text: `*Environment:*\n${environment}` },
        ],
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Action:*\n${action}` },
          { type: "mrkdwn", text: `*Actor:*\n${entry.actorId}` },
        ],
      },
    ];

    // Add changes summary if available
    if (entry.oldValue || entry.newValue) {
      const oldStr = entry.oldValue ? truncate(entry.oldValue, 100) : "—";
      const newStr = entry.newValue ? truncate(entry.newValue, 100) : "—";
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Changes:*\n\`${oldStr}\` → \`${newStr}\``,
        },
      });
    }

    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: `${entry.timestamp} • ${projectId}` }],
    });

    return { blocks };
  },
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}
