import type { FilterFn } from "../types";

export const eventTypeFilter: FilterFn = (webhook, entry) => {
  if (webhook.eventTypes.length === 0) return true;
  return webhook.eventTypes.includes(entry.action as never);
};
