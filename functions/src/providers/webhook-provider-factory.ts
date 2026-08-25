import type { AuditEntry, WebhookConfig } from "../types";
import { CustomWebhookProvider } from "./custom.provider";
import { DiscordWebhookProvider } from "./discord.provider";
import { GoogleChatWebhookProvider } from "./google-chat.provider";
import { MsTeamsWebhookProvider } from "./ms-teams.provider";
import { SlackWebhookProvider } from "./slack.provider";
import { StandardWebhookProvider } from "./standard.provider";
import { WebhookProvider } from "./webhook-provider";

// ─── Provider constructor type ─────────────────────────────────

type ProviderCtor = new (
  webhook: WebhookConfig,
  entry: AuditEntry,
  projectId: string,
) => WebhookProvider;

// ─── Registry ─────────────────────────────────────────────────

const PROVIDER_REGISTRY: Record<string, ProviderCtor> = {
  standard: StandardWebhookProvider,
  slack: SlackWebhookProvider,
  discord: DiscordWebhookProvider,
  "google-chat": GoogleChatWebhookProvider,
  "ms-teams": MsTeamsWebhookProvider,
  custom: CustomWebhookProvider,
};

// ─── Factory ───────────────────────────────────────────────────

/**
 * WebhookProviderFactory — Factory pattern.
 *
 * Reads webhook.format, instantiates the correct WebhookProvider subclass
 * with (webhook, entry, projectId), and returns it fully initialised.
 *
 * The provider already holds a constructed formatter — call trigger() directly:
 *
 *   const provider = WebhookProviderFactory.create(webhook, entry, projectId);
 *   const result   = await provider.trigger();
 */
export class WebhookProviderFactory {
  static create(webhook: WebhookConfig, entry: AuditEntry, projectId: string): WebhookProvider {
    const Ctor = PROVIDER_REGISTRY[webhook.format];
    if (!Ctor) {
      throw new Error(
        `Unknown webhook format: "${webhook.format}". ` +
          `Available: ${Object.keys(PROVIDER_REGISTRY).join(", ")}`,
      );
    }
    return new Ctor(webhook, entry, projectId);
  }

  static registeredFormats(): string[] {
    return Object.keys(PROVIDER_REGISTRY);
  }
}
