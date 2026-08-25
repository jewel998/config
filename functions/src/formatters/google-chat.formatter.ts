import { WebhookFormatter } from "./webhook-formatter";

/**
 * GoogleChatFormatter — Google Chat Card v2 envelope.
 *
 * buildRequestBody() maps title/body/fields into a cardsV2 structure.
 * Fields become decoratedText widgets. Body becomes the card subtitle.
 */
export class GoogleChatFormatter extends WebhookFormatter {
  buildRequestBody(): unknown {
    const title = this.formatTitle();
    const body = this.formatBody();
    const fields = this.formatFields();

    return {
      cardsV2: [
        {
          cardId: this.webhook.id,
          card: {
            header: {
              title,
              subtitle: body,
            },
            sections: [
              {
                widgets: fields.map((f) => ({
                  decoratedText: {
                    topLabel: f.label,
                    text: f.value,
                  },
                })),
              },
            ],
          },
        },
      ],
    };
  }
}
