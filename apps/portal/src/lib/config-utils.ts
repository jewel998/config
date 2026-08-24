import type {
  ConfigFlagExtended,
  PredicateGroup,
  SegmentUsageResult,
  TemplateType,
} from "@/lib/types";

/**
 * Combine a Date and time (hours/minutes) into an ISO 8601 string.
 */
export function combineDateAndTime(date: Date, hours: number, minutes: number): string {
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined.toISOString();
}

/**
 * Returns true if the given date is strictly before the start of today (local time).
 */
export function isPastDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

/**
 * Determines whether a template application should show a confirmation dialog
 * because the target section already has non-empty data.
 */
export function shouldConfirmOverwrite(
  templateType: TemplateType,
  state: {
    targetingRules: unknown[];
    rolloutPercentage?: number;
    overrides: Record<string, unknown>;
    schedule?: { targetValue: unknown; activateAt: string } | null;
  },
): boolean {
  switch (templateType) {
    case "beta-users":
      return state.targetingRules.length > 0;
    case "gradual-rollout":
      return (state.rolloutPercentage ?? 0) > 0;
    case "internal-only":
      return Object.keys(state.overrides).length > 0;
    case "scheduled-launch":
      return state.schedule != null;
    default:
      return false;
  }
}

/**
 * Validates that a segment name is non-empty (at least one non-whitespace character).
 */
export function validateSegmentName(name: string): boolean {
  return name.trim().length > 0;
}

/**
 * Computes which configs reference a given segment ID in their targeting rules.
 */
export function computeSegmentUsage(
  configs: ConfigFlagExtended[],
  segmentId: string,
): SegmentUsageResult {
  const configKeys: string[] = [];

  for (const config of configs) {
    const rules = config.targetingRules ?? [];
    let found = false;
    for (const rule of rules) {
      if (found) break;
      for (const group of rule.conditions) {
        if (found) break;
        for (const predicate of group.predicates) {
          if (
            (predicate.operator === "in_segment" || predicate.operator === "not_in_segment") &&
            predicate.value === segmentId
          ) {
            configKeys.push(config.key);
            found = true;
            break;
          }
        }
      }
    }
  }

  return { count: configKeys.length, configKeys };
}

/**
 * Formats predicate conditions into a readable inline summary string.
 *
 * Single group with single predicate: "plan equals pro"
 * Single group with multiple predicates: "plan equals pro AND country equals US"
 * Multiple groups: first group summary + "+ N more groups"
 */
export function formatConditionSummary(conditions: PredicateGroup[], maxGroups = 1): string {
  if (conditions.length === 0) return "No conditions";

  const formatGroup = (group: PredicateGroup): string => {
    if (group.predicates.length === 0) return "Empty group";
    return group.predicates.map((p) => `${p.attribute} ${p.operator} ${p.value}`).join(" AND ");
  };

  const firstGroups = conditions.slice(0, maxGroups);
  const summary = firstGroups.map(formatGroup).join(" OR ");
  const remaining = conditions.length - maxGroups;

  if (remaining > 0) {
    return `${summary} + ${remaining} more group${remaining === 1 ? "" : "s"}`;
  }

  return summary;
}
