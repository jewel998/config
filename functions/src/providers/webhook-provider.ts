import { DISPATCH_TIMEOUT_MS } from "../constants";
import { httpDispatcher } from "../dispatcher/http.dispatcher";
import type { WebhookFormatter } from "../formatters/webhook-formatter";
import type { AuditEntry, DispatchResult, WebhookConfig, WebhookDispatcher } from "../types";

// ─── Options passed to trigger() ──────────────────────────────

export interface TriggerOptions {
  /** Mutate the formatted payload in-place before dispatch (e.g. inject test:true). */
  mutatePayload?: (payload: Record<string, unknown>) => void;
  /** Override the HTTP dispatcher (e.g. swap in a mock for tests). */
  dispatcher?: WebhookDispatcher;
}

// ─── Abstract base class ───────────────────────────────────────

/**
 * WebhookProvider — owns the dispatch lifecycle.
 *
 * Formatting is fully delegated to a WebhookFormatter instance created by
 * each concrete subclass via createFormatter(). The provider's responsibilities:
 *   1. Store webhook config, entry, and projectId for the lifetime of the instance
 *   2. Instantiate the correct formatter (once, at construction)
 *   3. Run the trigger() lifecycle: build payload → mutate → dispatch
 *   4. Assemble common HTTP headers and supply the HTTP method
 *
 * Subclasses implement only createFormatter() — no constructor needed unless
 * the subclass adds its own state.
 *
 * Usage:
 *   const provider = WebhookProviderFactory.create(webhook, entry, projectId);
 *   const result   = await provider.trigger();
 */
export abstract class WebhookProvider {
  protected readonly webhook: WebhookConfig;
  protected readonly entry: AuditEntry;
  protected readonly projectId: string;
  private readonly formatter: WebhookFormatter;

  /**
   * HTTP method used when dispatching this webhook.
   * Defaults to POST — override in a subclass if a platform requires
   * a different method (e.g. PUT or PATCH).
   */
  protected readonly method: string = "POST";

  constructor(webhook: WebhookConfig, entry: AuditEntry, projectId: string) {
    this.webhook = webhook;
    this.entry = entry;
    this.projectId = projectId;
    // createFormatter() is called after all fields are assigned so subclass
    // implementations can safely reference this.webhook / this.entry if needed.
    this.formatter = this.createFormatter();
  }

  /**
   * Return the platform-specific formatter for this provider.
   * Called once at construction. this.webhook, this.entry, and this.projectId
   * are all set before this method is invoked.
   */
  protected abstract createFormatter(): WebhookFormatter;

  /**
   * Build a representative AuditEntry for test dispatches.
   * Kept on the base class so the test path goes through the same
   * provider + formatter lifecycle as real dispatches.
   */
  static buildTestEntry(actorId: string): AuditEntry {
    return {
      action: "update",
      actorId,
      timestamp: new Date().toISOString(),
      resourcePath: "environments/test/configs/sample.flag",
      oldValue: JSON.stringify({ value: false }),
      newValue: JSON.stringify({ value: true }),
    };
  }

  /**
   * Full trigger lifecycle:
   * 1. Delegate payload construction to the formatter
   * 2. Optionally mutate the payload (e.g. inject test flag)
   * 3. Dispatch via the HTTP dispatcher
   * 4. Return the DispatchResult
   */
  async trigger(options: TriggerOptions = {}): Promise<DispatchResult> {
    const dispatcher = options.dispatcher ?? httpDispatcher;
    const payload = this.formatter.buildRequestBody();

    if (options.mutatePayload && typeof payload === "object" && payload !== null) {
      options.mutatePayload(payload as Record<string, unknown>);
    }

    return dispatcher.dispatch(this.webhook.url, payload, {
      method: this.method,
      timeout: DISPATCH_TIMEOUT_MS,
      headers: {
        "Content-Type": this.formatter.contentType,
        "X-Webhook-Id": this.webhook.id,
        "X-Webhook-Timestamp": String(Math.floor(Date.now() / 1000)),
      },
    });
  }
}
