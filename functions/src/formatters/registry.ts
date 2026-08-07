import type { PayloadFormatter } from "../types.js";
import { customFormatter } from "./custom.formatter.js";
import { discordFormatter } from "./discord.formatter.js";
import { googleChatFormatter } from "./google-chat.formatter.js";
import { msTeamsFormatter } from "./ms-teams.formatter.js";
import { slackFormatter } from "./slack.formatter.js";
import { standardFormatter } from "./standard.formatter.js";

/**
 * Formatter registry (Strategy pattern).
 * Add new formatters by adding an entry here — zero changes to dispatch logic.
 */
const formatterRegistry: Record<string, PayloadFormatter> = {
  standard: standardFormatter,
  slack: slackFormatter,
  discord: discordFormatter,
  "google-chat": googleChatFormatter,
  "ms-teams": msTeamsFormatter,
  custom: customFormatter,
};

/**
 * Look up a formatter by name. Throws if format is not registered.
 */
export function getFormatter(format: string): PayloadFormatter {
  const formatter = formatterRegistry[format];
  if (!formatter) {
    throw new Error(
      `Unknown webhook format: "${format}". Available: ${Object.keys(formatterRegistry).join(", ")}`,
    );
  }
  return formatter;
}
