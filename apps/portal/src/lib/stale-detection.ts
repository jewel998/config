import { differenceInDays } from "date-fns";

export type StalenessLevel = "fresh" | "aging" | "stale";

const AGING_THRESHOLD_DAYS = 30;
const STALE_THRESHOLD_DAYS = 90;

/**
 * Determine how stale a config is based on its updatedAt date.
 * - fresh: updated within the last 30 days
 * - aging: updated 30-90 days ago
 * - stale: not updated in over 90 days
 */
export const getStalenessLevel = (updatedAt: string | undefined): StalenessLevel => {
  if (!updatedAt) return "stale";

  const days = differenceInDays(new Date(), new Date(updatedAt));

  if (days >= STALE_THRESHOLD_DAYS) return "stale";
  if (days >= AGING_THRESHOLD_DAYS) return "aging";
  return "fresh";
};

/** Human-readable staleness label */
export const getStalenessLabel = (level: StalenessLevel): string => {
  switch (level) {
    case "stale":
      return "Stale (90+ days)";
    case "aging":
      return "Aging (30+ days)";
    default:
      return "";
  }
};

/** Badge color classes for staleness */
export const getStalenessColor = (level: StalenessLevel): string => {
  switch (level) {
    case "stale":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "aging":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    default:
      return "";
  }
};
