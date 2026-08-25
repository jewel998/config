import { GoogleChatFormatter } from "../formatters/google-chat.formatter";
import { WebhookProvider } from "./webhook-provider";

export class GoogleChatWebhookProvider extends WebhookProvider {
  protected createFormatter() {
    return new GoogleChatFormatter(this.entry, this.webhook, this.projectId);
  }
}
