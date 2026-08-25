import { SlackFormatter } from "../formatters/slack.formatter";
import { WebhookProvider } from "./webhook-provider";

export class SlackWebhookProvider extends WebhookProvider {
  protected createFormatter() {
    return new SlackFormatter(this.entry, this.webhook, this.projectId);
  }
}
