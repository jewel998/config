import type { FilterFn } from "../types.js";
import { getEnvironmentFromPath } from "../utils/audit-utils.js";

export const environmentFilter: FilterFn = (webhook, entry) => {
  if (webhook.environments.length === 0) return true;
  const env = getEnvironmentFromPath(entry.resourcePath);
  if (env === null) return true; // No env segment = matches all
  return webhook.environments.includes(env);
};
