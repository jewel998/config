import type { AuditEntry, WebhookConfig } from "../types";
import { buildFormatterContext, capitalize, type FormatterContext } from "./utils";

// ─── Shared field descriptor ───────────────────────────────────

/**
 * A key/value pair that represents one line of metadata in the notification.
 * Every platform maps this to its own field shape (Slack mrkdwn, Discord
 * inline field, MS Teams FactSet row, Google Chat decoratedText, etc.).
 */
export interface FormatterField {
  label: string;
  value: string;
}

// ─── Abstract base class ───────────────────────────────────────

/**
 * WebhookFormatter — Template Method pattern.
 *
 * Owns the semantic content of a webhook notification, separated from the
 * platform envelope that wraps it. Concrete methods (formatTitle, formatBody,
 * formatFields, formatFooter) have sensible defaults that subclasses can
 * override individually. Only buildRequestBody() is abstract — it assembles
 * the final platform-specific envelope using the outputs of the other methods.
 *
 * Separation of concerns:
 *   formatTitle()      — what the notification headline says
 *   formatBody()       — the optional descriptive text
 *   formatFields()     — structured key/value metadata rows
 *   formatFooter()     — timestamp + project context line
 *   buildRequestBody() — platform envelope (Slack blocks, Discord embeds, etc.)
 *
 * Usage:
 *   class SlackFormatter extends WebhookFormatter {
 *     buildRequestBody() { ... wrap formatTitle/Fields/Footer into blocks ... }
 *   }
 */
export abstract class WebhookFormatter {
  protected readonly entry: AuditEntry;
  protected readonly webhook: WebhookConfig;
  protected readonly projectId: string;
  protected readonly ctx: FormatterContext;

  constructor(entry: AuditEntry, webhook: WebhookConfig, projectId: string) {
    this.entry = entry;
    this.webhook = webhook;
    this.projectId = projectId;
    this.ctx = buildFormatterContext(entry, webhook);
  }

  // ─── Content-Type header ────────────────────────────────────

  /**
   * MIME type for the Content-Type request header.
   * All current platforms use application/json. Override in a subclass if
   * a platform requires a different content type.
   *
   * Declared as a class field (not a getter) to match the override pattern
   * used by WebhookProvider.method.
   */
  readonly contentType: string = "application/json";

  // ─── Overridable content methods ────────────────────────────

  /**
   * The notification headline.
   * Default: "<emoji> <Category> <action>d"  e.g. "🔵 Config Updated"
   */
  formatTitle(): string {
    const { emoji, category, action } = this.ctx;
    return `${emoji} ${capitalize(category)} ${capitalize(action)}d`;
  }

  /**
   * Optional descriptive body text shown below the title.
   * Default: the resource name and path.
   */
  formatBody(): string {
    const { resourceName } = this.ctx;
    return resourceName;
  }

  /**
   * Structured key/value metadata rows shown in the notification.
   * Default: Resource, Environment, Action, Actor.
   * Override to add, remove, or reorder fields.
   *
   * For platforms that split fields into two visual groups (e.g. Slack sections),
   * override formatPrimaryFields() and formatSecondaryFields() instead — this
   * method returns their concatenation and should not need to be overridden directly.
   */
  formatFields(): FormatterField[] {
    return [...this.formatPrimaryFields(), ...this.formatSecondaryFields()];
  }

  /**
   * First group of fields — typically the "what" of the event.
   * Default: Resource, Environment.
   */
  formatPrimaryFields(): FormatterField[] {
    const { resourceName, environmentLabel } = this.ctx;
    return [
      { label: "Resource", value: resourceName },
      { label: "Environment", value: environmentLabel },
    ];
  }

  /**
   * Second group of fields — typically the "who/how" of the event.
   * Default: Action, Actor.
   * Override to append extra fields (e.g. diff/changes) without disturbing
   * the primary group.
   */
  formatSecondaryFields(): FormatterField[] {
    const { action } = this.ctx;
    return [
      { label: "Action", value: action },
      { label: "Actor", value: this.entry.actorId },
    ];
  }

  /**
   * Footer / context line shown at the bottom of the notification.
   * Default: "<ISO timestamp> • <projectId>"
   */
  formatFooter(): string {
    return `${this.entry.timestamp} • ${this.projectId}`;
  }

  // ─── Abstract platform envelope ─────────────────────────────

  /**
   * Assemble the final HTTP request body for the target platform.
   * Implementations call formatTitle/Body/Fields/Footer and wrap the results
   * in the platform-specific envelope shape.
   */
  abstract buildRequestBody(): unknown;
}
