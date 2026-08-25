import { WebhookProviderFactory } from "../providers/webhook-provider-factory";
import type { AuditEntry, DispatchResult, WebhookConfig, WebhookDispatcher } from "../types";

export interface DispatchWebhookOptions {
  /** Mutate the formatted payload before dispatch (e.g. inject test:true). */
  mutatePayload?: (payload: Record<string, unknown>) => void;
  /** Override the HTTP dispatcher (e.g. swap in a mock for tests). */
  dispatcher?: WebhookDispatcher;
}

/**
 * Create the correct provider for the webhook config and trigger it.
 * The factory passes (webhook, entry, projectId) to the provider constructor
 * so the formatter is fully initialised before trigger() is called.
 */
export async function dispatchWebhook(
  webhook: WebhookConfig,
  entry: AuditEntry,
  projectId: string,
  options: DispatchWebhookOptions = {},
): Promise<DispatchResult> {
  const provider = WebhookProviderFactory.create(webhook, entry, projectId);
  return provider.trigger(options);
}
