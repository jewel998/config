import type { AuditEntry, PayloadFormatter, WebhookConfig } from "../types";
import {
  getEnvironmentFromPath,
  getResourceCategory,
  formatResourceName,
} from "../utils/audit-utils";

/**
 * Custom template-based formatter.
 *
 * Reads the `customTemplate` field from the webhook config and interpolates
 * variables using {{dot.notation}} syntax.
 *
 * If the template is valid JSON, it parses and interpolates within it.
 * If it's plain text, it wraps the result in a standard `{ "text": "..." }` body.
 */
export const customFormatter: PayloadFormatter = {
  contentType: "application/json",

  format(entry: AuditEntry, webhook: WebhookConfig, projectId: string) {
    const template = webhook.customTemplate ?? "";
    const environment = getEnvironmentFromPath(entry.resourcePath);

    const vars: Record<string, unknown> = {
      action: entry.action,
      resource: {
        category: getResourceCategory(entry.resourcePath),
        path: entry.resourcePath,
        name: formatResourceName(entry.resourcePath),
      },
      environment: environment ?? "",
      actor: { id: entry.actorId },
      timestamp: entry.timestamp,
      project: { id: projectId },
      changes: {
        old: entry.oldValue ?? "",
        new: entry.newValue ?? "",
      },
      webhook: { id: webhook.id },
    };

    const interpolated = interpolate(template, vars);

    // Try to parse as JSON — if it's valid JSON, return the parsed object
    try {
      return JSON.parse(interpolated);
    } catch {
      // Plain text: wrap in a standard body
      return { text: interpolated };
    }
  },
};

function interpolate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
    const value = getNestedValue(vars, path.trim());
    return value !== undefined ? String(value) : `{{${path.trim()}}}`;
  });
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((current: unknown, key) => {
    if (current === null || current === undefined) return undefined;
    return (current as Record<string, unknown>)[key];
  }, obj);
}
