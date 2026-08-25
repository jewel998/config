import type { WebhookPayload } from "../types";
import { WebhookFormatter } from "./webhook-formatter";

/**
 * StandardFormatter — flat JSON payload.
 * No platform-specific envelope. Bypasses formatTitle/Fields/Footer and
 * maps the entry directly to the WebhookPayload shape.
 */
export class StandardFormatter extends WebhookFormatter {
  buildRequestBody(): WebhookPayload {
    const { action, resourceName, category, environment } = this.ctx;

    return {
      action,
      resourceCategory: category,
      resourcePath: this.entry.resourcePath,
      resourceName,
      environment,
      actorId: this.entry.actorId,
      timestamp: this.entry.timestamp,
      oldValue: this.entry.oldValue ? tryParse(this.entry.oldValue) : null,
      newValue: this.entry.newValue ? tryParse(this.entry.newValue) : null,
      projectId: this.projectId,
      webhookId: this.webhook.id,
    };
  }
}

function tryParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
