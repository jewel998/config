import { CustomFormatter } from "../formatters/custom.formatter";
import { WebhookProvider } from "./webhook-provider";

export class CustomWebhookProvider extends WebhookProvider {
  protected createFormatter() {
    return new CustomFormatter(this.entry, this.webhook, this.projectId);
  }
}
