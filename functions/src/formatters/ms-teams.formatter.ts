import { WebhookFormatter } from "./webhook-formatter";

/**
 * MsTeamsFormatter — Microsoft Teams Adaptive Card envelope.
 *
 * buildRequestBody() maps title/fields/footer into an Adaptive Card body.
 * Fields become a FactSet. Footer becomes a subtle TextBlock.
 */
export class MsTeamsFormatter extends WebhookFormatter {
  buildRequestBody(): unknown {
    const title = this.formatTitle();
    const fields = this.formatFields();
    const footer = this.formatFooter();

    return {
      type: "message",
      attachments: [
        {
          contentType: "application/vnd.microsoft.card.adaptive",
          content: {
            type: "AdaptiveCard",
            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
            version: "1.4",
            body: [
              {
                type: "TextBlock",
                text: title,
                weight: "Bolder",
                size: "Medium",
              },
              {
                type: "FactSet",
                facts: fields.map((f) => ({
                  title: f.label,
                  value: f.value,
                })),
              },
              {
                type: "TextBlock",
                text: footer,
                isSubtle: true,
                size: "Small",
              },
            ],
          },
        },
      ],
    };
  }
}
