import type { AuditEntry, FilterFn, WebhookConfig } from "../types";
import { environmentFilter } from "./environment.filter";
import { eventTypeFilter } from "./event-type.filter";
import { resourceCategoryFilter } from "./resource-category.filter";

/**
 * Composable filter pipeline (Chain of Responsibility).
 * Add new filters by pushing to this array — zero changes to evaluation logic.
 */
const filterPipeline: FilterFn[] = [eventTypeFilter, resourceCategoryFilter, environmentFilter];

/**
 * Evaluate all filters against a webhook/entry pair.
 * Short-circuits on first rejection.
 */
export function evaluateFilters(webhook: WebhookConfig, entry: AuditEntry): boolean {
  return filterPipeline.every((filter) => filter(webhook, entry));
}
