import type { AuditEntry, PayloadFormatter, WebhookConfig } from "../types.js";
import {
  getEnvironmentFromPath,
  getResourceCategory,
  formatResourceName,
} from "../utils/audit-utils.js";

export const googleChatFormatter: PayloadFormatter = {
  contentType: "application/json",

  format(entry: AuditEntry, webhook: WebhookConfig, projectId: string) {
    const action = entry.action;
    const resourceName = formatResourceName(entry.resourcePath);
    const category = getResourceCategory(entry.resourcePath);
    const environment = getEnvironmentFromPath(entry.resourcePath) ?? "—";

    const widgets = [
      { decoratedText: { topLabel: "Action", text: action } },
      { decoratedText: { topLabel: "Resource", text: resourceName } },
      { decoratedText: { topLabel: "Category", text: category } },
      { decoratedText: { topLabel: "Environment", text: environment } },
      { decoratedText: { topLabel: "Actor", text: entry.actorId } },
      { decoratedText: { topLabel: "Timestamp", text: entry.timestamp } },
      { decoratedText: { topLabel: "Project", text: projectId } },
    ];

    return {
      cardsV2: [
        {
          cardId: webhook.id,
          card: {
            header: {
              title: `Config ${capitalize(action)}d`,
              subtitle: resourceName,
            },
            sections: [{ widgets }],
          },
        },
      ],
    };
  },
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
