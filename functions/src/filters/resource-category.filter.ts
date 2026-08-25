import type { FilterFn } from "../types";
import { getResourceCategory } from "../utils/audit-utils";

export const resourceCategoryFilter: FilterFn = (webhook, entry) => {
  if (webhook.resourceCategories.length === 0) return true;
  const category = getResourceCategory(entry.resourcePath);
  // Unknown resource paths never match a webhook that filters by category
  if (category === null) return false;
  return webhook.resourceCategories.includes(category);
};
