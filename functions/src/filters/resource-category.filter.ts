import type { FilterFn } from "../types";
import { getResourceCategory } from "../utils/audit-utils";

export const resourceCategoryFilter: FilterFn = (webhook, entry) => {
  if (webhook.resourceCategories.length === 0) return true;
  const category = getResourceCategory(entry.resourcePath);
  return webhook.resourceCategories.includes(category);
};
