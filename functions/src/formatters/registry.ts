/**
 * @deprecated
 *
 * The formatter registry and PayloadFormatter interface have been replaced
 * by the WebhookProvider + WebhookFormatter class hierarchy.
 *
 * Use WebhookProviderFactory instead:
 *
 *   import { WebhookProviderFactory } from "../providers/webhook-provider-factory";
 *
 *   const provider = WebhookProviderFactory.create(webhook, entry, projectId);
 *   const result   = await provider.trigger();
 *
 * This file will be removed in the next cleanup pass once all consumers
 * have been migrated.
 */
export { WebhookProviderFactory as FormatterRegistry } from "../providers/webhook-provider-factory";
