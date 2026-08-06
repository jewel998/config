import type { PayloadFormatter } from "../types.js";
import { standardFormatter } from "./standard.formatter.js";
import { slackFormatter } from "./slack.formatter.js";

/**
 * Formatter registry (Strategy pattern).
 * Add new formatters by adding an entry here — zero changes to dispatch logic.
 */
const formatterRegistry: Record<string, PayloadFormatter> = {
  standard: standardFormatter,
  slack: slackFormatter,
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
