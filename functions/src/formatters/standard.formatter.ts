import type { AuditEntry, PayloadFormatter, WebhookConfig, WebhookPayload } from "../types";
import {
  getEnvironmentFromPath,
  getResourceCategory,
  formatResourceName,
} from "../utils/audit-utils";

export const standardFormatter: PayloadFormatter = {
  contentType: "application/json",

  format(entry: AuditEntry, webhook: WebhookConfig, projectId: string): WebhookPayload {
    return {
      action: entry.action,
      resourceCategory: getResourceCategory(entry.resourcePath),
      resourcePath: entry.resourcePath,
      resourceName: formatResourceName(entry.resourcePath),
      environment: getEnvironmentFromPath(entry.resourcePath),
      actorId: entry.actorId,
      timestamp: entry.timestamp,
      oldValue: entry.oldValue ? tryParse(entry.oldValue) : null,
      newValue: entry.newValue ? tryParse(entry.newValue) : null,
      projectId,
      webhookId: webhook.id,
    };
  },
};

function tryParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
