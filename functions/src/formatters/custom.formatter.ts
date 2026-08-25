import { WebhookFormatter } from "./webhook-formatter";

/**
 * CustomFormatter — user-defined template with {{dot.notation}} interpolation.
 *
 * This formatter intentionally does NOT use the inherited format methods
 * (formatTitle, formatBody, formatFields, formatSecondaryFields, formatFooter).
 * The customTemplate string on the webhook config is the sole source of truth
 * for the payload shape. Overriding those methods on this class has no effect.
 *
 * buildRequestBody() interpolates the template string with a fixed variable
 * map and either parses the result as JSON (if valid) or wraps it in
 * { text: "..." } for plain-text templates.
 *
 * Available template variables:
 *   {{action}}              — e.g. "update"
 *   {{resource.category}}   — e.g. "config"
 *   {{resource.path}}       — full Firestore path
 *   {{resource.name}}       — leaf resource name
 *   {{environment}}         — environment name or ""
 *   {{actor.id}}            — actorId from the audit entry
 *   {{timestamp}}           — ISO timestamp
 *   {{project.id}}          — projectId
 *   {{changes.old}}         — raw old value string or ""
 *   {{changes.new}}         — raw new value string or ""
 *   {{webhook.id}}          — webhook document ID
 */
export class CustomFormatter extends WebhookFormatter {
  buildRequestBody(): unknown {
    const template = this.webhook.customTemplate ?? "";
    const { action, resourceName, category, environment } = this.ctx;

    const vars: Record<string, unknown> = {
      action,
      resource: {
        category,
        path: this.entry.resourcePath,
        name: resourceName,
      },
      environment: environment ?? "",
      actor: { id: this.entry.actorId },
      timestamp: this.entry.timestamp,
      project: { id: this.projectId },
      changes: {
        old: this.entry.oldValue ?? "",
        new: this.entry.newValue ?? "",
      },
      webhook: { id: this.webhook.id },
    };

    const interpolated = interpolate(template, vars);

    try {
      return JSON.parse(interpolated);
    } catch {
      return { text: interpolated };
    }
  }
}

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
