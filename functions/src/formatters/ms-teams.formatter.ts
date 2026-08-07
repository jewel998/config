import type { AuditEntry, PayloadFormatter, WebhookConfig } from "../types.js";
import {
  getEnvironmentFromPath,
  getResourceCategory,
  formatResourceName,
} from "../utils/audit-utils.js";

const ACTION_EMOJI: Record<string, string> = {
  create: "🟢",
  update: "🔔",
  delete: "🗑️",
  state_change: "🔄",
};

export const msTeamsFormatter: PayloadFormatter = {
  contentType: "application/json",

  format(entry: AuditEntry, _webhook: WebhookConfig, projectId: string) {
    const action = entry.action;
    const emoji = ACTION_EMOJI[action] ?? "🔔";
    const resourceName = formatResourceName(entry.resourcePath);
    const category = getResourceCategory(entry.resourcePath);
    const environment = getEnvironmentFromPath(entry.resourcePath) ?? "—";

    return {
      type: "message",
      attachments: [
        {
          contentType: "application/vnd.microsoft.card.adaptive",
          content: {
            type: "AdaptiveCard",
            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
            version: "1.4",
            body: [
              {
                type: "TextBlock",
                text: `${emoji} Config ${capitalize(action)}d`,
                weight: "Bolder",
                size: "Medium",
              },
              {
                type: "FactSet",
                facts: [
                  { title: "Resource", value: resourceName },
                  { title: "Category", value: category },
                  { title: "Environment", value: environment },
                  { title: "Action", value: action },
                  { title: "Actor", value: entry.actorId },
                  { title: "Project", value: projectId },
                ],
              },
              {
                type: "TextBlock",
                text: entry.timestamp,
                isSubtle: true,
                size: "Small",
              },
            ],
          },
        },
      ],
    };
  },
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
