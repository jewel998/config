import type { AuditEntry, PayloadFormatter, WebhookConfig } from "../types";
import {
  getEnvironmentFromPath,
  getResourceCategory,
  formatResourceName,
} from "../utils/audit-utils";

const ACTION_COLORS: Record<string, number> = {
  create: 0x57f287, // green
  update: 0x5865f2, // blurple
  delete: 0xed4245, // red
  state_change: 0xfee75c, // yellow
};

const ACTION_EMOJI: Record<string, string> = {
  create: "🟢",
  update: "🔔",
  delete: "🗑️",
  state_change: "🔄",
};

export const discordFormatter: PayloadFormatter = {
  contentType: "application/json",

  format(entry: AuditEntry, _webhook: WebhookConfig, projectId: string) {
    const action = entry.action;
    const emoji = ACTION_EMOJI[action] ?? "🔔";
    const color = ACTION_COLORS[action] ?? 0x5865f2;
    const resourceName = formatResourceName(entry.resourcePath);
    const category = getResourceCategory(entry.resourcePath);
    const environment = getEnvironmentFromPath(entry.resourcePath) ?? "—";

    return {
      embeds: [
        {
          title: `${emoji} Config ${capitalize(action)}d`,
          color,
          fields: [
            { name: "Resource", value: resourceName, inline: true },
            { name: "Category", value: category, inline: true },
            { name: "Environment", value: environment, inline: true },
            { name: "Action", value: action, inline: true },
            { name: "Actor", value: entry.actorId, inline: true },
          ],
          footer: { text: `${entry.timestamp} • ${projectId}` },
        },
      ],
    };
  },
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
