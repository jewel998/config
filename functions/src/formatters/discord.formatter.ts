import { WebhookFormatter } from "./webhook-formatter";

const ACTION_COLORS: Record<string, number> = {
  create: 0x57f287, // green
  update: 0x5865f2, // blurple
  delete: 0xed4245, // red
  state_change: 0xfee75c, // yellow
};

/**
 * DiscordFormatter — Discord embed envelope.
 *
 * buildRequestBody() maps title/fields/footer into a Discord embed object.
 * Fields become inline embed fields. Footer becomes the embed footer text.
 */
export class DiscordFormatter extends WebhookFormatter {
  buildRequestBody(): unknown {
    const title = this.formatTitle();
    const fields = this.formatFields();
    const footer = this.formatFooter();
    const color = ACTION_COLORS[this.ctx.action] ?? 0x5865f2;

    return {
      embeds: [
        {
          title,
          color,
          fields: fields.map((f) => ({
            name: f.label,
            value: f.value,
            inline: true,
          })),
          footer: { text: footer },
        },
      ],
    };
  }
}
