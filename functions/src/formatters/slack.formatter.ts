import { truncate } from "./utils";
import type { FormatterField } from "./webhook-formatter";
import { WebhookFormatter } from "./webhook-formatter";

/**
 * SlackFormatter — Slack Block Kit envelope.
 *
 * Overrides formatSecondaryFields to append a changes diff row when the
 * entry has old/new values. buildRequestBody() maps the two field groups
 * into separate Slack sections — primary fields in the first section,
 * secondary (+ optional changes) in the second.
 */
export class SlackFormatter extends WebhookFormatter {
  override formatSecondaryFields(): FormatterField[] {
    const base = super.formatSecondaryFields();

    if (this.entry.oldValue || this.entry.newValue) {
      const oldStr = this.entry.oldValue ? truncate(this.entry.oldValue, 100) : "—";
      const newStr = this.entry.newValue ? truncate(this.entry.newValue, 100) : "—";
      base.push({ label: "Changes", value: `\`${oldStr}\` → \`${newStr}\`` });
    }

    return base;
  }

  buildRequestBody(): unknown {
    const title = this.formatTitle();
    const primaryFields = this.formatPrimaryFields();
    const secondaryFields = this.formatSecondaryFields();
    const footer = this.formatFooter();

    const toMrkdwn = (f: FormatterField) => ({
      type: "mrkdwn",
      text: `*${f.label}:*\n${f.value}`,
    });

    return {
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: title },
        },
        {
          type: "section",
          fields: primaryFields.map(toMrkdwn),
        },
        {
          type: "section",
          fields: secondaryFields.map(toMrkdwn),
        },
        {
          type: "context",
          elements: [{ type: "mrkdwn", text: footer }],
        },
      ],
    };
  }
}
