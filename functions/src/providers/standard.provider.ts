import { StandardFormatter } from "../formatters/standard.formatter";
import { WebhookProvider } from "./webhook-provider";

export class StandardWebhookProvider extends WebhookProvider {
  protected createFormatter() {
    return new StandardFormatter(this.entry, this.webhook, this.projectId);
  }
}
