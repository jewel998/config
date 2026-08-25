import { DiscordFormatter } from "../formatters/discord.formatter";
import { WebhookProvider } from "./webhook-provider";

export class DiscordWebhookProvider extends WebhookProvider {
  protected createFormatter() {
    return new DiscordFormatter(this.entry, this.webhook, this.projectId);
  }
}
