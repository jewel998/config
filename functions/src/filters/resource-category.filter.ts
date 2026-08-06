import type { FilterFn } from "../types.js";
import { getResourceCategory } from "../utils/audit-utils.js";

export const resourceCategoryFilter: FilterFn = (webhook, entry) => {
  if (webhook.resourceCategories.length === 0) return true;
  const category = getResourceCategory(entry.resourcePath);
  return webhook.resourceCategories.includes(category);
};
