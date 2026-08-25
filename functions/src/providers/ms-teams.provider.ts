import { MsTeamsFormatter } from "../formatters/ms-teams.formatter";
import { WebhookProvider } from "./webhook-provider";

export class MsTeamsWebhookProvider extends WebhookProvider {
  protected createFormatter() {
    return new MsTeamsFormatter(this.entry, this.webhook, this.projectId);
  }
}
